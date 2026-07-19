package com.lifecanvas.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class NotificationListenerBridge extends NotificationListenerService {
    private static final String TAG = "NotificationListener";

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.d(TAG, "NotificationListenerConnected - MediaSession access granted");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        // No-op: We only need this service to be granted BIND_NOTIFICATION_LISTENER_SERVICE
        // so that MediaWatcherService can access Active Sessions via MediaSessionManager.
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // No-op
    }
}
