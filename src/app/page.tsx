'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RitualBoard } from '@/components/RitualBoard';
import { SkillBoard } from '@/components/SkillBoard';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { JobBoard } from '@/components/JobBoard';
import { PushNotificationSetup } from '@/components/PushNotificationSetup';
import { useSyncState } from '@/hooks/useSyncState';

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState('todo');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationTime, setNotificationTime] = useSyncState('notificationTime', '20:00');

  if (!showDashboard) {
    return (
      <div className="flex flex-col min-h-screen relative z-10 fade-enter-active">
        {/* 极简 Header */}
        <header className="w-full pt-16 pb-12 flex justify-center items-center">
          <h1 className="text-xl font-light tracking-[0.25em] uppercase text-muji-text/80 select-none">
            LifeCanvas
          </h1>
        </header>

        {/* 主体内容区 */}
        <main className="flex-grow w-full max-w-5xl mx-auto px-6 pb-20 flex flex-col items-center justify-center">
          
          {/* 测试卡片 (Muji Surface) */}
          <div className="bg-muji-surface w-full max-w-md rounded-sm p-10 flex flex-col items-center gap-6 shadow-[var(--shadow-muji)] border border-muji-bg transition-transform duration-500 hover:-translate-y-1">
            
            {/* 图标 (Icon) */}
            <div className="p-3 bg-muji-bg rounded-full text-muji-accent shadow-sm">
              <span className="material-symbols-outlined stroke-[1.5]">psychiatry</span>
            </div>
            
            <div className="text-center space-y-3">
              <h2 className="text-lg font-medium text-muji-text tracking-wide">鹰与蝉</h2>
              <p className="text-sm leading-relaxed tracking-wider text-muji-text/80">
                人生到处知何似, 应似飞鸿踏雪泥。
              </p>
            </div>

            {/* 交互按钮展示色板 */}
            <div className="mt-4 flex gap-4 w-full">
              <button onClick={() => setShowDashboard(true)} className="flex-1 py-2.5 px-4 bg-muji-bg border border-muji-text/20 rounded-sm text-xs tracking-widest uppercase hover:border-muji-accent hover:text-muji-accent transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                Enter
              </button>
              <div className="flex-1 relative group">
                <input 
                  type="time" 
                  value={notificationTime} 
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  title="设置打卡提醒时间" 
                />
                <button className="w-full py-2.5 px-4 bg-muji-bg border border-muji-text/20 rounded-sm text-xs tracking-widest uppercase group-hover:border-muji-alert group-hover:text-muji-alert transition-all flex items-center justify-center gap-2 relative z-0">
                  <span className="material-symbols-outlined text-[16px]">notifications</span>
                  {notificationTime}
                </button>
              </div>
            </div>
            
          </div>
          
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-on-background font-body-md overflow-hidden w-full relative z-10 fade-enter-active">
      <PushNotificationSetup />
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main className={`flex-1 h-screen overflow-y-auto w-full transition-all duration-300 ease-in-out ${sidebarOpen ? 'md:ml-[64px]' : 'ml-0'}`}>
        {/* Top Bar */}
        <header className="flex justify-between items-center w-full px-4 md:px-10 h-16 sticky top-0 bg-surface/80 backdrop-blur-sm z-40">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors" title="导航">
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hidden md:inline" onClick={() => setShowDashboard(false)}>arrow_back</span>
            <h1 className="font-headline-md text-headline-md font-semibold text-primary cursor-pointer hover:opacity-80 transition-opacity hidden md:block" onClick={() => setShowDashboard(false)}>返回</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full border border-outline-variant/10">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="font-label-sm text-label-sm">云端同步</span>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="px-4 md:px-10 py-8 max-w-7xl mx-auto space-y-12 min-h-full">
          {activeTab === 'todo' && <RitualBoard />}
          {activeTab === 'habit' && <SkillBoard />}
          {activeTab === 'event' && <SubscriptionGuard />}
          {activeTab === 'growth' && <JobBoard />}
        </div>
        
        {/* Bottom Margin */}
        <div className="h-24"></div>
      </main>
    </div>
  );
}
