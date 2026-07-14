'use client';

import React, { useState, useEffect } from 'react';

// 用于将 VAPID 公钥从 Base64 转换为 Uint8Array 的工具函数
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationSetup() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // 检测是否支持 Service Worker 和 Push Manager
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // 如果还没授权，就弹出自定义的授权提示 UI
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      // 1. 请求系统通知权限
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('通知权限被拒绝');
        setShowPrompt(false);
        return;
      }

      // 2. 注册 Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // 等待 service worker 处于 active 状态
      await navigator.serviceWorker.ready;

      // 3. 通过 VAPID 公钥向浏览器的推送服务订阅
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        console.warn('尚未配置 NEXT_PUBLIC_VAPID_PUBLIC_KEY 环境变量');
        setShowPrompt(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // 4. 把生成的 Subscription 对象发给我们的 Vercel KV 后端
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      console.log('推送订阅成功，已同步至后端!');
      setShowPrompt(false);
    } catch (err) {
      console.error('订阅推送失败:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 可以在这里把用户的“拒绝”存入 localStorage，以免以后反复弹窗
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md">
      <div className="bg-surface-container-highest backdrop-blur-md p-4 rounded-xl border border-outline-variant/20 soft-shadow flex flex-col gap-3 slide-fade-enter-active">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-container/10 rounded-full text-primary mt-1">
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
          </div>
          <div>
            <h4 className="font-headline-md text-label-md text-on-surface">开启系统级通知守护</h4>
            <p className="text-[12px] text-on-surface-variant/80 mt-1 leading-relaxed">
              开启后，即使您关闭了浏览器，LifeCanvas 也会在后台守护您的日常仪式与即将到期的订阅。
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-1">
          <button 
            onClick={handleDismiss}
            className="px-4 py-1.5 rounded-lg text-label-sm font-label-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            以后再说
          </button>
          <button 
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className="px-4 py-1.5 rounded-lg text-label-sm font-label-sm bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubscribing ? '正在授权...' : '立即开启'}
          </button>
        </div>
      </div>
    </div>
  );
}
