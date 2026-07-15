'use client';

import React, { useRef } from 'react';
import { useSyncState } from '@/hooks/useSyncState';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab }: SidebarProps) {
  const [userAvatar, setUserAvatar] = useSyncState<string | null>('userAvatar', null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUserAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
        />
      )}

      {/* Navigation Drawer (Vertical Sidebar) */}
      <aside 
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col justify-center items-center space-y-12 bg-background border-r border-outline-variant/20 w-[64px] transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Anchor / Avatar */}
        <div 
          className="absolute top-8 left-1/2 -translate-x-1/2 cursor-pointer group" 
          onClick={() => avatarInputRef.current?.click()}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors pointer-events-none">
            {userAvatar ? (
              <img src={userAvatar} className="w-full h-full object-cover" alt="User Avatar" />
            ) : (
              <span className="text-primary font-bold text-[14px]">LD</span>
            )}
          </div>
          <input 
            type="file" 
            ref={avatarInputRef} 
            onChange={uploadAvatar} 
            accept="image/*" 
            className="hidden" 
            title="更换头像" 
          />
        </div>

        {/* Vertical Tabs Container */}
        <nav className="flex flex-col items-center w-full space-y-4">
          <button 
            onClick={() => setActiveTab('todo')} 
            className={`group relative flex flex-col items-center justify-center font-bold rounded-xl py-4 w-full gap-2 transition-all cursor-pointer border-none outline-none ${
              activeTab === 'todo' ? 'bg-surface-container-highest text-on-surface active:scale-95' : 'text-on-surface-variant/70 hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-label-md text-label-md" style={{ writingMode: 'vertical-lr', letterSpacing: '0.2em' }}>待办</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('habit')} 
            className={`group flex flex-col items-center justify-center py-4 w-full gap-2 transition-colors cursor-pointer rounded-xl border-none outline-none ${
              activeTab === 'habit' ? 'bg-surface-container-highest text-on-surface font-bold' : 'text-on-surface-variant/70 hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">repeat</span>
            <span className="font-label-md text-label-md" style={{ writingMode: 'vertical-lr', letterSpacing: '0.2em' }}>习惯</span>
          </button>

          <button 
            onClick={() => setActiveTab('event')} 
            className={`group flex flex-col items-center justify-center py-4 w-full gap-2 transition-colors cursor-pointer rounded-xl border-none outline-none ${
              activeTab === 'event' ? 'bg-surface-container-highest text-on-surface font-bold' : 'text-on-surface-variant/70 hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span className="font-label-md text-label-md" style={{ writingMode: 'vertical-lr', letterSpacing: '0.2em' }}>事件</span>
          </button>

          <button 
            onClick={() => setActiveTab('growth')} 
            className={`group flex flex-col items-center justify-center py-4 w-full gap-2 transition-colors cursor-pointer rounded-xl border-none outline-none ${
              activeTab === 'growth' ? 'bg-surface-container-highest text-on-surface font-bold' : 'text-on-surface-variant/70 hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">trending_up</span>
            <span className="font-label-md text-label-md" style={{ writingMode: 'vertical-lr', letterSpacing: '0.2em' }}>成长</span>
          </button>

          <button 
            onClick={() => setActiveTab('summary')} 
            className={`group flex flex-col items-center justify-center py-4 w-full gap-2 transition-colors cursor-pointer rounded-xl border-none outline-none ${
              activeTab === 'summary' ? 'bg-surface-container-highest text-on-surface font-bold' : 'text-on-surface-variant/70 hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history_edu</span>
            <span className="font-label-md text-label-md" style={{ writingMode: 'vertical-lr', letterSpacing: '0.2em' }}>总结</span>
          </button>
        </nav>

        {/* Collapse / Hide Button */}
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 p-1.5 rounded-lg text-on-surface-variant/50 hover:text-primary hover:bg-surface-container-low transition-colors md:flex hidden" 
          title="收起侧边栏"
        >
          <span className="material-symbols-outlined text-[18px]">left_panel_close</span>
        </button>
      </aside>
    </>
  );
}
