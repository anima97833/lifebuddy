'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { MediaTracker } from '../plugins/MediaTrackerPlugin';
import { useMediaTracker } from '../hooks/useMediaTracker';

export function MediaTrackerSetup() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [pendingSession, setPendingSession] = useState<any>(null);
  
  // To load skills
  const [skills, setSkills] = useSyncState<any[]>('skills', []);
  
  // Initialize the background tracking logic
  useMediaTracker((info) => {
    // Info contains title, packageName, durationMs, startTime
    if (info.durationMs > 5000) { // Only ask if > 5s
      setPendingSession(info);
    }
  });

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

  const saveToSkill = (skillIndex: number) => {
    if (!pendingSession) return;
    const minutes = Math.ceil(pendingSession.durationMs / 60000);
    
    setSkills(prev => {
      const copy = [...(prev || [])];
      if (skillIndex >= 0 && skillIndex < copy.length) {
        copy[skillIndex].items.push({
          name: pendingSession.title,
          url: 'Automated Tracker',
          duration: minutes
        });
      }
      return copy;
    });
    setPendingSession(null);
  };

  if (!Capacitor.isNativePlatform()) return null;

  return (
    <>
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

      {/* Session Modal */}
      {pendingSession && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface-container-highest p-6 rounded-2xl w-full max-w-sm space-y-4">
            <h3 className="font-headline-md text-primary">学习记录自动保存</h3>
            <p className="text-sm text-on-surface-variant">
              你刚刚看了 <strong>{Math.ceil(pendingSession.durationMs / 60000)} 分钟</strong> 的<br/>
              《{pendingSession.title}》。<br/><br/>
              请选择要将这段时间加入到哪个技能下：
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(skills || []).map((skill, index) => (
                <button 
                  key={index}
                  onClick={() => saveToSkill(index)}
                  className="w-full text-left p-3 rounded-lg bg-surface-container hover:bg-primary-container hover:text-on-primary-container transition-colors border border-outline-variant/10"
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">{skill.icon}</span>
                    {skill.title}
                  </div>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setPendingSession(null)}
              className="w-full p-3 text-center text-error hover:bg-error-container rounded-lg transition-colors mt-2"
            >
              忽略这次记录
            </button>
          </div>
        </div>
      )}
    </>
  );
}
