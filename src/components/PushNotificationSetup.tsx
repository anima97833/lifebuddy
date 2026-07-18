'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AIChatAgent } from './AIChatAgent';


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

  const syncSubscription = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive !== 'granted') {
            console.warn('[PushSetup] 原生环境通知权限未授予');
            return;
          }

          // 注册原生推送
          await PushNotifications.register();
        } catch (err) {
          console.error('[PushSetup] 注册原生推送出错 (可能是 Firebase 缺失):', err);
        }
        return;
      }


      // --- 网页 (Web Push) 环境 ---
      // 先确保 SW 已注册
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      await navigator.serviceWorker.ready;
      registration = (await navigator.serviceWorker.getRegistration('/'))!;

      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // 本地 subscription 已失效，重新订阅获取新 token
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (publicVapidKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          });
          console.log('[PushSetup] 本地 subscription 已失效，已重新生成新 token');
        }
      }

      if (subscription) {
        // 每次都强制上传，服务器端会按 endpoint 去重，
        // 这样即使服务器侧把过期的 token 删除了，下次开页面也能自动补回来
        const res = await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        const json = await res.json();
        console.log('[PushSetup] 静默同步网页推送订阅完成', json);
      } else {
        console.warn('[PushSetup] 静默同步：未能获取到有效网页 subscription');
      }
    } catch (e) {
      console.error('[PushSetup] 静默同步订阅失败:', e);
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        // 原生环境：只需注册监听器，不要直接请求权限！
        PushNotifications.addListener('registration', async (token) => {
          console.log('[PushSetup] 获取到原生 FCM Token:', token.value);
          const subscription = {
            endpoint: `fcm-native-${token.value}`,
            keys: { auth: '', p256dh: '' },
            token: token.value
          };
          try {
            const res = await fetch('/api/push-subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscription)
            });
            console.log('[PushSetup] 原生 Token 已同步到服务器', await res.json());
          } catch (err) {
            console.error('[PushSetup] 原生 Token 同步失败', err);
          }
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[PushSetup] 原生注册失败:', JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[PushSetup] 原生前台收到推送:', notification);
        });

        // 检查是否已经授权，如果已授权则静默同步，未授权则弹窗
        PushNotifications.checkPermissions().then(perm => {
          if (perm.receive === 'granted') {
            syncSubscription();
          } else {
            setShowPrompt(true); // 让用户手动点击按钮触发
          }
        });
      } catch (e) {
        console.error('[PushSetup] 添加推送监听器失败 (可能是 Firebase 未配置):', e);
      }
      return;
    }

    // 检测是否支持 Service Worker 和 Push Manager (Web 环境)
    // 注意：必须先检查 typeof Notification，否则在 Android WebView 中会抗出 ReferenceError
    if ('serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined') {
      // 如果还没授权，就弹出自定义的授权提示 UI
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      } else if (Notification.permission === 'granted') {
        // 静默同步订阅到服务器，防止因为覆盖导致手机端凭据丢失
        syncSubscription();
      }
    }
  }, []);

  const handleSubscribe = async () => {
    console.log('[PushSetup] 1. 开始订阅流程');
    setIsSubscribing(true);
    try {
      if (Capacitor.isNativePlatform()) {
        console.log('[PushSetup] 2. 请求原生系统通知权限...');
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          console.log('[PushSetup] 3. 原生通知权限已授予，正在注册...');
          await PushNotifications.register();
          setShowPrompt(false);
        } else {
          console.warn('[PushSetup] 原生通知权限被拒绝');
        }
        setIsSubscribing(false);
        return;
      }

      // Web 推送逻辑
      console.log('[PushSetup] 2. 请求系统通知权限...');
      const permission = await Notification.requestPermission();
      console.log(`[PushSetup] 3. 通知权限结果: ${permission}`);
      
      if (permission !== 'granted') {
        console.warn('[PushSetup] 通知权限被拒绝或忽略');
        setShowPrompt(false);
        return;
      }

      console.log('[PushSetup] 4. 等待 Service Worker Ready...');
      const registration = await navigator.serviceWorker.ready;

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDataSheetOpen, setIsDataSheetOpen] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const importFileRef = React.useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. 从 Supabase 拉取所有云端数据（待办/仪式/订阅/成长/求职/收藏分布等）
      const res = await fetch('/api/sync');
      const result = await res.json();
      const cloudData: Record<string, unknown> = result.data || {};

      // 2. 合并 localStorage 里的本地配置（AI机器人配置/聊天记录等）
      const localKeys = ['aiChatConfig', 'aiBots', 'aiActiveBotId', 'aiChatHistories'];
      const localData: Record<string, unknown> = {};
      localKeys.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          try { localData[key] = JSON.parse(raw); }
          catch { localData[key] = raw; }
        }
      });

      const fullBackup = {
        _meta: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          source: 'LifeBuddy'
        },
        cloud: cloudData,
        local: localData,
      };

      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifebuddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败，请检查网络连接后重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const backup = JSON.parse(ev.target?.result as string);

        // 1. 恢复云端数据（Supabase）
        const cloudData: Record<string, unknown> = backup.cloud || backup; // 兼容旧版
        const cloudRestorePromises = Object.entries(cloudData)
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) =>
            fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: k, value: v }),
            })
          );
        await Promise.all(cloudRestorePromises);

        // 2. 恢复本地配置（localStorage）
        const localData: Record<string, unknown> = backup.local || {};
        Object.entries(localData).forEach(([k, v]) => {
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        });

        setImportMsg('✓ 导入成功，即将刷新页面...');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setImportMsg('⚠️ 文件格式错误，请选择正确的备份文件');
        setTimeout(() => setImportMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!showPrompt) {
    // 在原生 APP 中，Notification API 不存在，改用 Capacitor 平台检测
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
    const hasWebNotif = typeof window !== 'undefined' && typeof Notification !== 'undefined' && Notification.permission === 'granted';

    if (isNative || hasWebNotif) {
      return (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <AIChatAgent isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
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
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`absolute p-3 rounded-full bg-surface-container-high text-on-surface hover:bg-primary hover:text-white shadow-lg transition-all duration-300 delay-75 ${isDialOpen ? 'translate-x-[-51px] translate-y-[-51px]' : 'translate-x-0 translate-y-0'} flex items-center justify-center`}
              title="AI 智能助手"
              style={{ bottom: 0, right: 0 }}
            >
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </button>

            {/* Item 3: 数据管理 (angle 180, straight left) */}
            <button 
              onClick={() => { setIsDataSheetOpen(true); setIsDialOpen(false); }}
              className={`absolute p-3 rounded-full bg-surface-container-high text-on-surface hover:bg-primary hover:text-white shadow-lg transition-all duration-300 delay-150 ${isDialOpen ? 'translate-x-[-72px]' : 'translate-x-0'} flex items-center justify-center`}
              title="数据管理"
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

          {/* ─── Bottom Sheet: 数据管理 ─── */}
          {/* Backdrop */}
          {isDataSheetOpen && (
            <div
              className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[2px]"
              onClick={() => setIsDataSheetOpen(false)}
            />
          )}
          {/* Sheet */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl shadow-2xl transition-all duration-400 ease-out ${
              isDataSheetOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
            }`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-6 pb-8 pt-2">
              <h3 className="text-[16px] font-bold text-gray-800 mb-1">数据管理</h3>
              <p className="text-[12px] text-gray-400 mb-5">导出备份文件可防止网页更新时数据丢失</p>

              {/* Export */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 transition-all group mb-3 disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors flex-shrink-0">
                  <span className={`material-symbols-outlined text-[22px] text-green-700 ${isExporting ? 'animate-spin' : ''}`}>
                    {isExporting ? 'sync' : 'download'}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold text-gray-800">{isExporting ? '正在导出...' : '导出备份'}</div>
                  <div className="text-[12px] text-gray-400">包含云端所有数据 + AI配置</div>
                </div>
              </button>

              {/* Import */}
              <button
                onClick={() => importFileRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-[22px] text-blue-700">upload</span>
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold text-gray-800">导入恢复</div>
                  <div className="text-[12px] text-gray-400">从 JSON 备份文件恢复全部数据</div>
                </div>
              </button>

              {importMsg && (
                <div className="mt-4 text-center text-[13px] font-medium text-green-600">{importMsg}</div>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
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
