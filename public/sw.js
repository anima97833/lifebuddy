self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const title = data.title || 'LifeCanvas 提醒';
      const options = {
        body: data.body || '您有新的待办或到期预警',
        icon: '/icon.png', // 极简风格的默认图标，需在 public 下准备
        badge: '/badge.png',
        data: data.url || '/' // 点击通知后跳转的地址
      };
      
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error('Push payload parse error', err);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // 引导用户跳转到相应页面
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
