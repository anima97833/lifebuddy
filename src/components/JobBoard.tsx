'use client';

import React, { useMemo, useState } from 'react';
import { useSyncState } from '@/hooks/useSyncState';

interface Job {
  company: string;
  role: string;
  location: string;
  salary: string;
  status: string;
}

export function JobBoard() {
  const [jobs, setJobs] = useSyncState<Job[]>('jobs', [
    { company: '维兰工作室', role: '资深产品设计师', location: '上海 / 混合办公', salary: '25k-30k', status: '一面' },
    { company: 'Kinfolk', role: '艺术总监', location: '远程', salary: '', status: '简历初筛' }
  ]);

  const [jobPage, setJobPage] = useState(0);

  const totalJobPages = Math.ceil((jobs?.length || 0) / 4);
  const paginatedJobs = useMemo(() => {
    if (!jobs) return [];
    const start = jobPage * 4;
    return jobs.slice(start, start + 4);
  }, [jobs, jobPage]);

  const addJob = () => {
    setJobs((prev) => [
      ...prev,
      { company: '', role: '', location: '', salary: '', status: '简历初筛' }
    ]);
  };

  const removeJob = (index: number) => {
    if (!window.confirm("确定要删除这条申请记录吗？")) return;
    setJobs((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    if (jobPage >= totalJobPages - 1 && jobPage > 0) {
      setJobPage(p => p - 1);
    }
  };

  return (
    <div className="space-y-12">
      <div className="bg-surface-container-lowest rounded-xl p-4 md:p-8 soft-shadow border border-outline-variant/10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-headline-md text-headline-md text-primary">求职看板</h3>
          <div className="flex items-center gap-2">
            {totalJobPages > 1 && (
              <button onClick={() => setJobPage(p => Math.max(0, p - 1))} disabled={jobPage === 0} className="p-1 rounded-lg bg-surface-variant hover:bg-outline-variant/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-primary">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
            )}
            {totalJobPages > 1 && (
              <button onClick={() => setJobPage(p => Math.min(totalJobPages - 1, p + 1))} disabled={jobPage === totalJobPages - 1} className="p-1 rounded-lg bg-surface-variant hover:bg-outline-variant/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-primary">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            )}
            <button onClick={addJob} className="bg-primary-container text-white px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary transition-all flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">add</span>
              新增申请
            </button>
          </div>
        </div>
        
        <div className="w-full">
          {/* Header (Desktop only) */}
          <div className="hidden md:flex text-left text-on-surface-variant/60 pb-4 px-4 font-label-sm text-label-sm uppercase tracking-wider">
            <div className="w-1/3">公司</div>
            <div className="w-1/4">岗位</div>
            <div className="w-1/4">地点</div>
            <div className="w-1/6 text-right">状态</div>
          </div>
          
          <div className="space-y-4">
            {paginatedJobs.map((job, idx) => {
              const actualIndex = jobPage * 4 + idx;
              return (
                <div key={actualIndex} 
                     className={`transition-colors rounded-xl p-4 md:p-2 md:px-4 flex flex-col md:flex-row md:items-center gap-4 group relative ${
                       job.status === 'Offer' ? 'bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 ring-1 ring-emerald-400/30' : 'bg-surface-container-low/50 hover:bg-surface-container-low'
                     }`}>
                  {/* Mobile Close Btn */}
                  <button onClick={() => removeJob(actualIndex)} className="absolute right-2 top-2 md:right-4 md:top-1/2 md:-translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-error hover:bg-error-container rounded transition-all z-10 md:hidden">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                  
                  {/* Company */}
                  <div className="w-full md:w-1/3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center font-bold text-primary flex-shrink-0">
                      {job.company ? job.company.charAt(0).toUpperCase() : 'N'}
                    </div>
                    <input 
                      value={job.company}
                      onChange={(e) => {
                        setJobs(prev => {
                          const copy = [...prev];
                          copy[actualIndex].company = e.target.value;
                          return copy;
                        });
                      }}
                      className="font-headline-md text-headline-md bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-full md:w-3/4 transition-colors placeholder:text-on-surface-variant/40" 
                      placeholder="公司名"
                    />
                  </div>

                  {/* Role */}
                  <div className="w-full md:w-1/4 flex justify-between items-center md:block">
                    <span className="md:hidden text-label-sm text-on-surface-variant/60 uppercase">岗位</span>
                    <input 
                      value={job.role}
                      onChange={(e) => {
                        setJobs(prev => {
                          const copy = [...prev];
                          copy[actualIndex].role = e.target.value;
                          return copy;
                        });
                      }}
                      className="font-body-md text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-2/3 md:w-full transition-colors text-right md:text-left placeholder:text-on-surface-variant/40" 
                      placeholder="职位名称"
                    />
                  </div>

                  {/* Location & Salary */}
                  <div className="w-full md:w-1/4 flex flex-col items-end md:items-start justify-center gap-1">
                    <div className="flex justify-between items-center md:block w-full">
                      <span className="md:hidden text-label-sm text-on-surface-variant/60 uppercase">地点</span>
                      <input 
                        value={job.location}
                        onChange={(e) => {
                          setJobs(prev => {
                            const copy = [...prev];
                            copy[actualIndex].location = e.target.value;
                            return copy;
                          });
                        }}
                        className="font-body-md text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-2/3 md:w-full transition-colors text-right md:text-left placeholder:text-on-surface-variant/40" 
                        placeholder="城市/远程"
                      />
                    </div>
                    <div className="flex justify-between items-center md:block w-full">
                      <span className="md:hidden text-label-sm text-on-surface-variant/60 uppercase">薪资</span>
                      <input 
                        value={job.salary}
                        onChange={(e) => {
                          setJobs(prev => {
                            const copy = [...prev];
                            copy[actualIndex].salary = e.target.value;
                            return copy;
                          });
                        }}
                        className="font-body-sm text-on-surface-variant/80 bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-2/3 md:w-full transition-colors text-right md:text-left placeholder:text-on-surface-variant/30" 
                        placeholder="薪资范围"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-full md:w-1/6 flex justify-between items-center md:justify-end pr-0 md:pr-10 relative">
                    <span className="md:hidden text-label-sm text-on-surface-variant/60 uppercase">状态</span>
                    <select 
                      value={job.status}
                      onChange={(e) => {
                        setJobs(prev => {
                          const copy = [...prev];
                          copy[actualIndex].status = e.target.value;
                          return copy;
                        });
                      }}
                      className="px-2 py-1 bg-surface-variant text-on-surface-variant rounded-full text-[12px] md:text-[13px] font-label-sm w-[120px] text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary border border-transparent hover:border-outline-variant/30 transition-colors" 
                      dir="rtl"
                    >
                      <option value="简历初筛">简历初筛</option>
                      <option value="笔试/测试件评估">笔试/测试件评估</option>
                      <option value="一面">一面</option>
                      <option value="二面">二面</option>
                      <option value="Offer">Offer</option>
                      <option value="人才库">人才库</option>
                    </select>
                  </div>
                  
                  {/* Desktop Close Btn */}
                  <button onClick={() => removeJob(actualIndex)} className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-error hover:bg-error-container rounded transition-all z-10">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
