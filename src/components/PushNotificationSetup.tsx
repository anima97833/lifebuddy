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
    console.log('[PushSetup] 1. 开始订阅流程');
    setIsSubscribing(true);
    try {
      console.log('[PushSetup] 2. 请求系统通知权限...');
      const permission = await Notification.requestPermission();
      console.log(`[PushSetup] 3. 通知权限结果: ${permission}`);
      
      if (permission !== 'granted') {
        console.warn('[PushSetup] 通知权限被拒绝或忽略');
        setShowPrompt(false);
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        console.log('[PushSetup] 4. 未发现已有 Registration，开始注册 Service Worker (/sw.js)...');
        registration = await navigator.serviceWorker.register('/sw.js');
      } else {
        console.log('[PushSetup] 4. 发现已有 Registration，复用现有的 Service Worker。');
      }
      
      console.log('[PushSetup] 5. Service Worker 注册成功:', registration);
      
      console.log('[PushSetup] 6. 等待 Service Worker 处于 active 状态...');
      await navigator.serviceWorker.ready;
      console.log('[PushSetup] 7. Service Worker 已 ready');

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log('[PushSetup] 8. 获取到的 VAPID 公钥:', publicVapidKey ? '存在' : '缺失 (undefined)');
      
      if (!publicVapidKey) {
        console.warn('[PushSetup] 尚未配置 NEXT_PUBLIC_VAPID_PUBLIC_KEY 环境变量');
        setShowPrompt(false);
        return;
      }

      console.log('[PushSetup] 9. 获取现有订阅或向浏览器 PushManager 发起新订阅请求...');
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      }
      
      console.log('[PushSetup] 10. 获取到 Push Subscription 对象:', subscription);
      console.log('[PushSetup] -> 当前设备 endpoint:', subscription.endpoint);

      console.log('[PushSetup] 11. 将 Subscription 发送至后端...');
      const response = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '后端保存凭证失败');
      }

      console.log('[PushSetup] 12. 后端响应:', result);

      console.log('[PushSetup] 推送订阅成功，已同步至后端!');
      setShowPrompt(false);
    } catch (err) {
      console.error('[PushSetup] 订阅推送失败:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestPush = async () => {
    setIsSubscribing(true);
    try {
      const res = await fetch('/api/test-push', { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        alert('测试失败: ' + data.error);
      } else {
        console.log('测试通知已发出！');
      }
    } catch (err: any) {
      alert('测试请求失败: ' + err.message);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 可以在这里把用户的“拒绝”存入 localStorage，以免以后反复弹窗
  };

  const [isDialOpen, setIsDialOpen] = useState(false);

  if (!showPrompt) {
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      return (
        <div className="fixed bottom-4 right-4 z-[9999]">
          {/* Radial Menu Items */}
          <div className={`absolute bottom-0 right-0 w-12 h-12 transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${isDialOpen ? 'opacity-100' : 'opacity-0 pointer-events-none scale-50'}`}>
            {/* Item 1: Test Push (angle 90, straight up) */}
            <button 
              onClick={handleTestPush}
              disabled={isSubscribing}
              className={`absolute p-3 rounded-full bg-surface-container-high text-on-surface hover:bg-primary hover:text-white shadow-lg transition-all duration-300 ${isDialOpen ? 'translate-y-[-72px]' : 'translate-y-0'} flex items-center justify-center`}
              title="测试云端推送链路"
              style={{ bottom: 0, right: 0 }}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
            
            {/* Item 2: AI Chat Placeholder (angle 135, up-left) */}
            <button 
              onClick={() => { alert('AI聊天功能开发中...') }}
              className={`absolute p-3 rounded-full bg-surface-container-high text-on-surface hover:bg-primary hover:text-white shadow-lg transition-all duration-300 delay-75 ${isDialOpen ? 'translate-x-[-51px] translate-y-[-51px]' : 'translate-x-0 translate-y-0'} flex items-center justify-center`}
              title="AI 智能助手"
              style={{ bottom: 0, right: 0 }}
            >
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </button>

            {/* Item 3: Future Expansion (angle 180, straight left) */}
            <button 
              onClick={() => { alert('更多功能敬请期待...') }}
              className={`absolute p-3 rounded-full bg-surface-container-high text-on-surface hover:bg-primary hover:text-white shadow-lg transition-all duration-300 delay-150 ${isDialOpen ? 'translate-x-[-72px]' : 'translate-x-0'} flex items-center justify-center`}
              title="更多扩展"
              style={{ bottom: 0, right: 0 }}
            >
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
          </div>

          {/* Main FAB (Flower) */}
          <button 
            onClick={() => setIsDialOpen(!isDialOpen)}
            className="relative p-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center z-10"
            title="扩展菜单"
          >
            <span className={`material-symbols-outlined text-[24px] transition-transform duration-500 ${isDialOpen ? 'rotate-180 scale-110' : 'rotate-0'}`}>
              filter_vintage
            </span>
          </button>
        </div>
      );
    }
    return null;
  }

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
