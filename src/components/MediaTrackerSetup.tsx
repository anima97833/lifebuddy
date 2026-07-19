'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { MediaTracker } from '../plugins/MediaTrackerPlugin';
import { useMediaTracker } from '../hooks/useMediaTracker';

export function MediaTrackerSetup() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  
  // Initialize the background tracking logic
  useMediaTracker();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      checkPerms();
    }
  }, []);

  const checkPerms = async () => {
    try {
      const { hasNotificationAccess, hasOverlayAccess } = await MediaTracker.checkPermissions();
      setHasPermissions(hasNotificationAccess && hasOverlayAccess);
    } catch (e) {
      console.warn('Failed to check media tracker permissions', e);
    }
  };

  const startTracking = async () => {
    try {
      const { hasNotificationAccess, hasOverlayAccess } = await MediaTracker.checkPermissions();
      
      if (!hasOverlayAccess) {
        alert("请授予悬浮窗权限，以便显示学习计时器。");
        await MediaTracker.requestOverlayAccess();
        return;
      }
      
      if (!hasNotificationAccess) {
        alert("请在接下来的页面中，找到 LifeCanvas 并允许通知访问权限，这样才能感知到视频播放。");
        await MediaTracker.requestNotificationAccess();
        return;
      }
      
      await MediaTracker.startWatching();
      setIsWatching(true);
      alert("学习监控悬浮球已启动！去打开B站看看吧。");
    } catch (err: any) {
      alert("启动失败: " + err.message);
    }
  };

  const stopTracking = async () => {
    try {
      await MediaTracker.stopWatching();
      setIsWatching(false);
    } catch (err: any) {
      console.warn('Failed to stop watching', err);
    }
  };

  if (!Capacitor.isNativePlatform()) return null;

  return (
    <div className="fixed top-24 right-4 z-[9990]">
       {!isWatching ? (
         <button 
           onClick={startTracking}
           className="bg-primary text-white p-3 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
           title="开启学习监控悬浮球"
         >
           <span className="material-symbols-outlined text-[20px]">psychology</span>
         </button>
       ) : (
         <button 
           onClick={stopTracking}
           className="bg-red-500 text-white p-3 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
           title="关闭监控"
         >
           <span className="material-symbols-outlined text-[20px]">stop_circle</span>
         </button>
       )}
    </div>
  );
}
