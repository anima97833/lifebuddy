'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useSyncState } from '@/hooks/useSyncState';

interface Subscription {
  icon: string;
  name: string;
  amount: number | string;
  cycle: string;
  expiry: string;
}

export function SubscriptionGuard() {
  const [subscriptions, setSubscriptions] = useSyncState<Subscription[]>('subscriptions', [
    { icon: 'subscriptions', name: 'Netflix Premium', amount: 15.99, cycle: '按月', expiry: '2023-11-15' },
    { icon: 'fitness_center', name: '健身房年卡', amount: 299.00, cycle: '按年', expiry: '2024-05-20' }
  ]);

  const [subPage, setSubPage] = useState(0);

  const totalSubPages = Math.ceil((subscriptions?.length || 0) / 4);
  const paginatedSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    const start = subPage * 4;
    return subscriptions.slice(start, start + 4);
  }, [subscriptions, subPage]);

  const addSubscription = () => {
    setSubscriptions((prev) => [
      ...prev,
      { icon: 'star', name: '', amount: '', cycle: '按月', expiry: '' }
    ]);
  };

  const removeSubscription = (index: number) => {
    if (!window.confirm("确定要删除这项订阅吗？")) return;
    setSubscriptions((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    if (subPage >= totalSubPages - 1 && subPage > 0) {
      setSubPage(p => p - 1);
    }
  };

  const getDaysUntilExpiry = (expiryStr: string) => {
    if (!expiryStr) return null;
    const expiry = new Date(expiryStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalSubscriptionCost = useMemo(() => {
    if (!subscriptions) return 0;
    return subscriptions.reduce((total, sub) => {
      const amount = Number(sub.amount) || 0;
      return total + (sub.cycle === '按年' ? amount / 12 : amount);
    }, 0).toFixed(2);
  }, [subscriptions]);

  // 自动清理过期订阅
  useEffect(() => {
    if (!subscriptions) return;

    let hasExpired = false;
    const validSubscriptions = subscriptions.filter(sub => {
      const daysLeft = getDaysUntilExpiry(sub.expiry);
      // 如果已设置日期，并且剩余天数 <= 0，则判定为已过期
      if (daysLeft !== null && daysLeft <= 0) {
        hasExpired = true;
        return false;
      }
      return true;
    });

    if (hasExpired) {
      setSubscriptions(validSubscriptions);
      // 修正当前页码，防止删空导致白屏
      const newTotalPages = Math.ceil(validSubscriptions.length / 4);
      if (subPage >= newTotalPages && newTotalPages > 0) {
        setSubPage(newTotalPages - 1);
      } else if (newTotalPages === 0) {
        setSubPage(0);
      }
    }
  }, [subscriptions, setSubscriptions, subPage]);

  return (
    <div className="space-y-12">
      <div className="bg-primary-container p-5 md:p-8 rounded-xl soft-shadow text-white relative overflow-hidden max-w-md mx-auto">
        <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
        </div>
        <div className="flex justify-between items-center mb-2 relative z-10">
          <h3 className="font-headline-md text-headline-md">订阅守卫</h3>
          <div className="flex items-center gap-1">
            {totalSubPages > 1 && (
              <button onClick={() => setSubPage(p => Math.max(0, p - 1))} disabled={subPage === 0} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
            )}
            {totalSubPages > 1 && (
              <button onClick={() => setSubPage(p => Math.min(totalSubPages - 1, p + 1))} disabled={subPage === totalSubPages - 1} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            )}
            <button onClick={addSubscription} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center ml-1" title="添加订阅">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
        </div>
        <p className="font-label-sm text-label-sm text-white/70 mb-6 uppercase tracking-wider relative z-10">未来30天预估: ${totalSubscriptionCost}</p>
        
        <div className="space-y-2 relative z-10">
          {paginatedSubscriptions.map((sub, idx) => {
            const actualIndex = subPage * 4 + idx;
            const daysLeft = getDaysUntilExpiry(sub.expiry);
            const isExpiringSoon = daysLeft !== null && daysLeft <= 5;
            
            return (
              <div key={actualIndex}
                className={`group backdrop-blur-md p-3 rounded-lg border relative transition-all duration-300 ${
                  isExpiringSoon
                    ? 'bg-amber-400/20 border-amber-300/60 ring-1 ring-amber-300/40'
                    : 'bg-white/10 border-white/10'
                }`}
              >
                <button onClick={() => removeSubscription(actualIndex)} className="absolute -left-3 top-3 p-1 opacity-0 group-hover:opacity-100 text-white/60 hover:text-white hover:bg-error/80 rounded transition-all">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                
                {isExpiringSoon && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-400/30 text-amber-200 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    <span className="material-symbols-outlined text-[12px]">alarm</span>
                    {daysLeft === 0 ? '今日到期' : `${daysLeft}天后到期`}
                  </div>
                )}
                
                <div className="flex items-center gap-2 w-full">
                  <span className="material-symbols-outlined text-white/80 flex-shrink-0 text-[18px] md:text-[24px]">{sub.icon}</span>
                  <input 
                    value={sub.name}
                    onChange={(e) => {
                      setSubscriptions(prev => {
                        const copy = [...prev];
                        copy[actualIndex].name = e.target.value;
                        return copy;
                      });
                    }}
                    className="font-headline-md text-label-md bg-transparent border-b border-transparent hover:border-white/30 focus:border-white focus:outline-none w-full min-w-0 transition-colors placeholder-white/50 text-white" 
                    placeholder="订阅名称"
                  />
                  <div className="flex items-center flex-shrink-0 ml-1">
                    <span className="font-title-md text-title-md mr-0.5 text-sm">$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={sub.amount}
                      onChange={(e) => {
                        setSubscriptions(prev => {
                          const copy = [...prev];
                          copy[actualIndex].amount = e.target.value;
                          return copy;
                        });
                      }}
                      className="font-title-md text-title-md bg-transparent border-b border-transparent hover:border-white/30 focus:border-white focus:outline-none w-14 text-right transition-colors text-sm" 
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-[10px] text-white/60 mt-1 pl-6">
                  <select 
                    value={sub.cycle}
                    onChange={(e) => {
                      setSubscriptions(prev => {
                        const copy = [...prev];
                        copy[actualIndex].cycle = e.target.value;
                        return copy;
                      });
                    }}
                    className="text-[10px] bg-transparent border-b border-transparent hover:border-white/30 focus:border-white focus:outline-none cursor-pointer appearance-none outline-none flex-shrink-0"
                  >
                    <option className="text-black" value="按月">按月</option>
                    <option className="text-black" value="按年">按年</option>
                  </select>
                  <span className="pointer-events-none flex-shrink-0 whitespace-nowrap mx-1">• 到期</span>
                  <div className="relative flex-1 min-w-0">
                    <input 
                      type="date" 
                      value={sub.expiry}
                      onChange={(e) => {
                        setSubscriptions(prev => {
                          const copy = [...prev];
                          copy[actualIndex].expiry = e.target.value;
                          return copy;
                        });
                      }}
                      className="text-[10px] bg-transparent border-b border-white/30 focus:border-white focus:outline-none w-full transition-colors text-white/80 cursor-pointer"
                      style={{ colorScheme: 'dark' }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
