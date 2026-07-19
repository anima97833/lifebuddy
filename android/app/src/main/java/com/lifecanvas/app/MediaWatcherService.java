package com.lifecanvas.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.util.ArrayList;
import java.util.List;

public class MediaWatcherService extends Service {
    private static final String TAG = "MediaWatcherService";
    private static final String CHANNEL_ID = "media_watcher_channel";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_MEDIA_STATE_CHANGED = "com.lifecanvas.app.MEDIA_STATE_CHANGED";
    public static final String EXTRA_PACKAGE_NAME = "package_name";
    public static final String EXTRA_IS_PLAYING = "is_playing";
    public static final String EXTRA_TITLE = "title";

    private MediaSessionManager mediaSessionManager;
    private ComponentName componentName;
    private final List<MediaController> activeControllers = new ArrayList<>();

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());

        mediaSessionManager = (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
        componentName = new ComponentName(this, NotificationListenerBridge.class);

        try {
            setupMediaSessionListeners();
        } catch (SecurityException e) {
            Log.e(TAG, "Notification Access not granted. Cannot monitor media.", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Learning Tracker",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("LifeCanvas")
                .setContentText("Learning tracker is active")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void setupMediaSessionListeners() throws SecurityException {
        // Initial setup
        updateControllers(mediaSessionManager.getActiveSessions(componentName));

        // Listen for changes in active sessions
        mediaSessionManager.addOnActiveSessionsChangedListener(controllers -> {
            updateControllers(controllers);
        }, componentName);
    }

    private void updateControllers(List<MediaController> controllers) {
        // Unregister old callbacks
        for (MediaController controller : activeControllers) {
            controller.unregisterCallback(mediaCallback);
        }
        activeControllers.clear();

        if (controllers != null) {
            for (MediaController controller : controllers) {
                // Check if it's an app we care about (e.g., bilibili)
                String packageName = controller.getPackageName();
                if (isTargetApp(packageName)) {
                    controller.registerCallback(mediaCallback);
                    activeControllers.add(controller);
                    // Trigger initial state
                    triggerUpdate(controller);
                }
            }
        }
    }

    private boolean isTargetApp(String packageName) {
        // We now track all media sessions so that if the user watches
        // a course on a browser or an unknown app, it still gets captured.
        // We exclude system UI or our own app if needed, but it's fine for now.
        return true;
    }

    private void triggerUpdate(MediaController controller) {
        PlaybackState state = controller.getPlaybackState();
        MediaMetadata metadata = controller.getMetadata();
        
        boolean isPlaying = state != null && state.getState() == PlaybackState.STATE_PLAYING;
        String title = "Unknown Video";
        if (metadata != null) {
            CharSequence titleSequence = metadata.getText(MediaMetadata.METADATA_KEY_TITLE);
            if (titleSequence != null) {
                title = titleSequence.toString();
            }
        }
        
        Intent intent = new Intent(ACTION_MEDIA_STATE_CHANGED);
        intent.putExtra(EXTRA_PACKAGE_NAME, controller.getPackageName());
        intent.putExtra(EXTRA_IS_PLAYING, isPlaying);
        intent.putExtra(EXTRA_TITLE, title);
        
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    private final MediaController.Callback mediaCallback = new MediaController.Callback() {
        @Override
        public void onPlaybackStateChanged(@Nullable PlaybackState state) {
            // Find which controller this state belongs to, but it's easier to just update all active
            for (MediaController controller : activeControllers) {
                if (controller.getPlaybackState() != null && 
                    controller.getPlaybackState().equals(state)) {
                    triggerUpdate(controller);
                    break;
                }
            }
        }

        @Override
        public void onMetadataChanged(@Nullable MediaMetadata metadata) {
            for (MediaController controller : activeControllers) {
                // Trigger update to refresh title
                triggerUpdate(controller);
            }
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
