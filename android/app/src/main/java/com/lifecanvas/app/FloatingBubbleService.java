package com.lifecanvas.app;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class FloatingBubbleService extends Service {
    private static final String CHANNEL_ID = "floating_bubble_channel";
    private static final int NOTIFICATION_ID = 1002;

    private WindowManager windowManager;
    private View floatingView;
    private WindowManager.LayoutParams params;

    private boolean isPlaying = false;
    private long sessionStartTime = 0;
    private long accumulatedTime = 0;
    private String currentTitle = "";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable timerRunnable = new Runnable() {
        @Override
        public void run() {
            if (isPlaying) {
                updateTimerDisplay();
                handler.postDelayed(this, 1000);
            }
        }
    };

    private final BroadcastReceiver mediaReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            boolean playing = intent.getBooleanExtra(MediaWatcherService.EXTRA_IS_PLAYING, false);
            String title = intent.getStringExtra(MediaWatcherService.EXTRA_TITLE);
            
            currentTitle = title;
            TextView titleView = floatingView.findViewById(R.id.bubble_title);
            if (titleView != null) {
                titleView.setText(title);
            }

            if (playing && !isPlaying) {
                // Started playing
                isPlaying = true;
                sessionStartTime = System.currentTimeMillis();
                handler.post(timerRunnable);
                floatingView.setVisibility(View.VISIBLE);
            } else if (!playing && isPlaying) {
                // Stopped playing
                isPlaying = false;
                handler.removeCallbacks(timerRunnable);
                
                // Hide bubble and reset timer since the session will be saved now
                floatingView.setVisibility(View.GONE);
                accumulatedTime = 0;
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());

        LocalBroadcastManager.getInstance(this).registerReceiver(
                mediaReceiver, new IntentFilter(MediaWatcherService.ACTION_MEDIA_STATE_CHANGED));

        createFloatingWindow();
    }

    @SuppressLint("InflateParams")
    private void createFloatingWindow() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        LayoutInflater inflater = (LayoutInflater) getSystemService(LAYOUT_INFLATER_SERVICE);
        
        // This requires the layout files to exist. We'll create bubble_layout.xml
        floatingView = inflater.inflate(R.layout.bubble_layout, null);

        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 100;

        windowManager.addView(floatingView, params);

        setupDragListener();
        
        // Hide initially until media starts
        floatingView.setVisibility(View.GONE);
    }

    @SuppressLint("ClickableViewAccessibility")
    private void setupDragListener() {
        android.view.GestureDetector gestureDetector = new android.view.GestureDetector(this, new android.view.GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onDoubleTap(MotionEvent e) {
                if (isPlaying) {
                    // Stop timer and hide bubble
                    isPlaying = false;
                    handler.removeCallbacks(timerRunnable);
                    floatingView.setVisibility(View.GONE);
                    
                    long totalTimeMs = accumulatedTime + (System.currentTimeMillis() - sessionStartTime);
                    accumulatedTime = 0;
                    
                    // Send end session broadcast manually
                    Intent endIntent = new Intent(MediaWatcherService.ACTION_MEDIA_STATE_CHANGED);
                    endIntent.putExtra(MediaWatcherService.EXTRA_IS_PLAYING, false);
                    endIntent.putExtra(MediaWatcherService.EXTRA_TITLE, currentTitle);
                    endIntent.putExtra("FORCE_END", true); // Optional flag
                    LocalBroadcastManager.getInstance(FloatingBubbleService.this).sendBroadcast(endIntent);
                    
                    // Bring MainActivity to foreground
                    Intent launchIntent = new Intent(FloatingBubbleService.this, MainActivity.class);
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                    startActivity(launchIntent);
                }
                return true;
            }
        });

        floatingView.findViewById(R.id.bubble_root).setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (gestureDetector.onTouchEvent(event)) {
                    return true; // Handled by GestureDetector (double tap)
                }
                
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(floatingView, params);
                        return true;
                }
                return false;
            }
        });
    }

    private void updateTimerDisplay() {
        long currentTotal = accumulatedTime + (System.currentTimeMillis() - sessionStartTime);
        int seconds = (int) (currentTotal / 1000) % 60;
        int minutes = (int) ((currentTotal / (1000 * 60)) % 60);
        int hours = (int) ((currentTotal / (1000 * 60 * 60)) % 24);

        TextView timerView = floatingView.findViewById(R.id.bubble_timer);
        if (timerView != null) {
            @SuppressLint("DefaultLocale") String timeStr = String.format("%02d:%02d:%02d", hours, minutes, seconds);
            timerView.setText(timeStr);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Floating Bubble",
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
                .setContentTitle("LifeCanvas Overlay")
                .setContentText("Learning bubble is active")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingView != null) {
            windowManager.removeView(floatingView);
        }
        LocalBroadcastManager.getInstance(this).unregisterReceiver(mediaReceiver);
        handler.removeCallbacks(timerRunnable);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
