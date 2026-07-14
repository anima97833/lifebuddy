'use client';

import React, { useMemo, useState } from 'react';
import { useSyncState } from '@/hooks/useSyncState';

interface Ritual {
  icon: string;
  name: string;
  completed: number;
  target: number;
  color: string;
  lastCheckInDate: string;
}

export function RitualBoard() {
  const [rituals, setRituals] = useSyncState<Ritual[]>('rituals', [
    { icon: 'menu_book', name: '哲学阅读', completed: 15, target: 18, color: 'outline', lastCheckInDate: '' },
    { icon: 'draw', name: '素描速写', completed: 5, target: 12, color: 'primary', lastCheckInDate: '' }
  ]);

  const [ritualPage, setRitualPage] = useState(0);

  const totalRitualPages = Math.ceil((rituals?.length || 0) / 4);
  const paginatedRituals = useMemo(() => {
    if (!rituals) return [];
    const start = ritualPage * 4;
    return rituals.slice(start, start + 4);
  }, [rituals, ritualPage]);

  const addRitual = () => {
    setRituals((prev) => [
      ...prev,
      { icon: 'star', name: '', completed: 0, target: 21, color: 'primary', lastCheckInDate: '' }
    ]);
  };

  const removeRitual = (index: number) => {
    setRituals((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    if (ritualPage >= totalRitualPages - 1 && ritualPage > 0) {
      setRitualPage((p) => p - 1);
    }
  };

  const checkInRitual = (index: number) => {
    setRituals((prev) => {
      const copy = [...prev];
      if (copy[index].completed < copy[index].target) {
        copy[index].completed++;
        copy[index].lastCheckInDate = new Date().toLocaleDateString();
      }
      return copy;
    });
  };

  const completionRate = rituals?.length
    ? Math.round((rituals.reduce((acc, r) => acc + Number(r.completed), 0) / rituals.reduce((acc, r) => acc + Number(r.target), 0)) * 100) || 0
    : 0;

  return (
    <div className="space-y-12">
      <div className="bg-white/50 backdrop-blur-lg rounded-xl p-8 border border-outline-variant/10 soft-shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <h3 className="font-headline-md text-headline-md text-primary">日常仪式</h3>
            <button onClick={addRitual} className="p-1 rounded-lg bg-primary-container/10 hover:bg-primary-container/20 text-primary transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-label-sm text-label-sm text-on-surface-variant/60">本月达成率: {completionRate}%</p>
            <div className="flex gap-2">
              {totalRitualPages > 1 && (
                <button onClick={() => setRitualPage(p => Math.max(0, p - 1))} disabled={ritualPage === 0} className="p-2 hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
              )}
              {totalRitualPages > 1 && (
                <button onClick={() => setRitualPage(p => Math.min(totalRitualPages - 1, p + 1))} disabled={ritualPage === totalRitualPages - 1} className="p-2 hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {paginatedRituals.map((ritual, idx) => {
            const actualIndex = ritualPage * 4 + idx;
            const isCheckedIn = ritual.lastCheckInDate === new Date().toLocaleDateString();
            
            return (
              <div key={actualIndex} className="space-y-6 relative group">
                <button onClick={() => removeRitual(actualIndex)} className="absolute -left-6 lg:-left-8 top-0 p-1 opacity-0 group-hover:opacity-100 text-error hover:bg-error-container rounded transition-all">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-0">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container">{ritual.icon}</span>
                    <input 
                      value={ritual.name}
                      onChange={(e) => {
                        setRituals(prev => {
                          const copy = [...prev];
                          copy[actualIndex].name = e.target.value;
                          return copy;
                        });
                      }}
                      className="font-headline-md text-headline-md bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-full md:w-32 transition-colors placeholder:text-on-surface-variant/40" 
                      placeholder="仪式名称"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <div className="flex items-center font-headline-md text-headline-md text-primary">
                      <span className="w-8 text-right">{ritual.completed}</span>
                      <span className="mx-1">/</span>
                      <input 
                        type="number" 
                        min="1" 
                        value={ritual.target}
                        onChange={(e) => {
                          setRituals(prev => {
                            const copy = [...prev];
                            copy[actualIndex].target = Number(e.target.value);
                            return copy;
                          });
                        }}
                        className="w-10 bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                      />
                      <span className="text-on-surface-variant/40 text-label-sm ml-1">天</span>
                    </div>
                    <button 
                      onClick={() => checkInRitual(actualIndex)} 
                      disabled={isCheckedIn || ritual.completed >= ritual.target}
                      className={`ml-2 px-3 py-1 rounded-full text-[12px] font-medium transition-all flex-shrink-0 ${
                        isCheckedIn 
                          ? 'bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed' 
                          : 'bg-primary text-on-primary hover:opacity-90 active:scale-95 shadow-sm'
                      }`}
                    >
                      {isCheckedIn ? '今日已打卡' : '今日打卡'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: ritual.target || 0 }).map((_, n) => (
                    <div 
                      key={n} 
                      className={`w-4 h-4 rounded-full dot-anim transition-colors ${
                        n < (ritual.completed || 0) 
                          ? (ritual.color === 'primary' ? 'bg-primary-container' : 'bg-outline-variant') 
                          : (ritual.color === 'primary' ? 'border border-primary-container/30' : 'border border-outline-variant')
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
