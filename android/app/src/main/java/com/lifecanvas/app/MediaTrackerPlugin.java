package com.lifecanvas.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "MediaTracker",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class MediaTrackerPlugin extends Plugin {
    private static final String TAG = "MediaTrackerPlugin";
    private boolean isListening = false;
    private long sessionStartTime = 0;
    private String currentTitle = "";
    private String currentPackage = "";
    private boolean wasPlaying = false;

    private final BroadcastReceiver mediaReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            boolean isPlaying = intent.getBooleanExtra(MediaWatcherService.EXTRA_IS_PLAYING, false);
            String title = intent.getStringExtra(MediaWatcherService.EXTRA_TITLE);
            String packageName = intent.getStringExtra(MediaWatcherService.EXTRA_PACKAGE_NAME);
            boolean forceEnd = intent.getBooleanExtra("FORCE_END", false);
            
            handleMediaStateChange(isPlaying, title, packageName, forceEnd);
        }
    };

    @Override
    protected void handleOnStart() {
        super.handleOnStart();
        if (isListening) {
            LocalBroadcastManager.getInstance(getContext())
                .registerReceiver(mediaReceiver, new IntentFilter(MediaWatcherService.ACTION_MEDIA_STATE_CHANGED));
        }
    }

    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        if (isListening) {
            LocalBroadcastManager.getInstance(getContext()).unregisterReceiver(mediaReceiver);
        }
    }

    @PluginMethod
    public void startWatching(PluginCall call) {
        if (!hasNotificationListenerPermission()) {
            call.reject("Notification listener permission not granted");
            return;
        }

        if (!Settings.canDrawOverlays(getContext())) {
            call.reject("System alert window permission not granted");
            return;
        }

        isListening = true;
        LocalBroadcastManager.getInstance(getContext())
            .registerReceiver(mediaReceiver, new IntentFilter(MediaWatcherService.ACTION_MEDIA_STATE_CHANGED));

        // Start services
        Intent watcherIntent = new Intent(getContext(), MediaWatcherService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(watcherIntent);
        } else {
            getContext().startService(watcherIntent);
        }

        Intent bubbleIntent = new Intent(getContext(), FloatingBubbleService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(bubbleIntent);
        } else {
            getContext().startService(bubbleIntent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stopWatching(PluginCall call) {
        isListening = false;
        LocalBroadcastManager.getInstance(getContext()).unregisterReceiver(mediaReceiver);
        
        getContext().stopService(new Intent(getContext(), MediaWatcherService.class));
        getContext().stopService(new Intent(getContext(), FloatingBubbleService.class));
        
        call.resolve();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("hasNotificationAccess", hasNotificationListenerPermission());
        ret.put("hasOverlayAccess", Settings.canDrawOverlays(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationAccess(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void requestOverlayAccess(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private boolean hasNotificationListenerPermission() {
        String pkgName = getContext().getPackageName();
        String listeners = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        return listeners != null && listeners.contains(pkgName);
    }

    private org.json.JSONArray pendingSessions = new org.json.JSONArray();

    @PluginMethod
    public void getPendingSessions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("sessions", pendingSessions);
        call.resolve(ret);
        // Clear them after retrieving
        pendingSessions = new org.json.JSONArray();
    }

    private void handleMediaStateChange(boolean isPlaying, String title, String packageName, boolean forceEnd) {
        // Send state to JS
        JSObject data = new JSObject();
        data.put("isPlaying", isPlaying);
        data.put("title", title);
        data.put("packageName", packageName);
        notifyListeners("mediaStateChanged", data);

        // Session logic
        if (isPlaying && !wasPlaying) {
            // Started playing
            sessionStartTime = System.currentTimeMillis();
            currentTitle = title;
            currentPackage = packageName;
            notifyListeners("sessionStarted", data);
        } else if (!isPlaying && wasPlaying) {
            // Stopped playing
            long durationMs = System.currentTimeMillis() - sessionStartTime;
            
            // Only save if duration > 5 seconds, OR if it was a forced end (double tap)
            if (durationMs > 5000 || forceEnd) {
                JSObject sessionData = new JSObject();
                sessionData.put("title", currentTitle);
                sessionData.put("packageName", currentPackage != null ? currentPackage : "com.unknown");
                sessionData.put("durationMs", durationMs);
                sessionData.put("startTime", sessionStartTime);
                
                // Cache it natively so we don't lose it while WebView is frozen
                try {
                    pendingSessions.put(new org.json.JSONObject(sessionData.toString()));
                } catch (Exception e) {
                    e.printStackTrace();
                }
                
                notifyListeners("sessionEnded", sessionData);
            }
        } else if (isPlaying && wasPlaying && !currentTitle.equals(title)) {
            // Title changed while playing (switched videos without pausing)
            long durationMs = System.currentTimeMillis() - sessionStartTime;
            if (durationMs > 5000) {
                JSObject sessionData = new JSObject();
                sessionData.put("title", currentTitle);
                sessionData.put("packageName", currentPackage);
                sessionData.put("durationMs", durationMs);
                sessionData.put("startTime", sessionStartTime);
                try {
                    pendingSessions.put(new org.json.JSONObject(sessionData.toString()));
                } catch (Exception e) {
                    e.printStackTrace();
                }
                notifyListeners("sessionEnded", sessionData);
            }
            // Reset for new video
            sessionStartTime = System.currentTimeMillis();
            currentTitle = title;
            currentPackage = packageName;
            notifyListeners("sessionStarted", data);
        }
        
        wasPlaying = isPlaying;
    }
}
