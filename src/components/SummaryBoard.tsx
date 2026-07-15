'use client';

import React, { useState, useMemo } from 'react';
import { useSyncState } from '@/hooks/useSyncState';

interface SummaryTimelineItem {
  time: string;
  title: string;
  desc: string;
  bgClass: string;
}

interface SummaryPhase {
  id: number;
  name: string;
  timeline: SummaryTimelineItem[];
}

interface SummaryProject {
  id: number;
  name: string;
  description: string;
  expanded: boolean;
  activePhaseId: number;
  phases: SummaryPhase[];
}

const defaultSummaryProjects: SummaryProject[] = [
  {
    id: 1,
    name: 'LifeCanvas MVP',
    description: '这是我第一个独立开发的完整项目，旨在解决个人时间管理的痛点。',
    expanded: true,
    activePhaseId: 1,
    phases: [
      {
        id: 1,
        name: '一',
        timeline: [
          { time: 'Day 1-30', title: '全情投入：完成MVP开发', desc: '不眠不休的30天，完成了核心业务逻辑与UI搭建，第一次将想法变成了现实，产品顺利上线。', bgClass: 'bg-[#dfceba]' }
        ]
      },
      {
        id: 2,
        name: '二',
        timeline: [
          { time: 'Day 31-45', title: '败因复盘：现实的骨感', desc: '用户留存率惨淡。未充分验证受众需求，闭门造车导致产品脱离实际使用场景，推广受阻，未能实现PMF (Product-Market Fit)。', bgClass: 'bg-[#c3d4f1]' }
        ]
      },
      {
        id: 3,
        name: '三',
        timeline: [
          { time: 'Day 46-60', title: '宝贵收获：涅槃重生', desc: '完整走通了从0到1的开发闭环，掌握了Vue3与独立开发核心技术栈。更重要的是，深刻认识到了解用户需求的重要性，为下一次征程积累了宝贵的经验。', bgClass: 'bg-[#f0c8c9]' }
        ]
      }
    ]
  }
];

export function SummaryBoard() {
  const [summaryProjects, setSummaryProjects] = useSyncState<SummaryProject[]>('summaryProjects', defaultSummaryProjects);
  const [activeSummaryProjectId, setActiveSummaryProjectId] = useState<number>(defaultSummaryProjects[0].id);

  const activeSummaryProject = useMemo(() => {
    return summaryProjects.find(p => p.id === activeSummaryProjectId) || summaryProjects[0];
  }, [summaryProjects, activeSummaryProjectId]);

  const activeSummaryPhase = useMemo(() => {
    if (!activeSummaryProject) return null;
    return activeSummaryProject.phases?.find(p => p.id === activeSummaryProject.activePhaseId) || activeSummaryProject.phases?.[0];
  }, [activeSummaryProject]);

  const addSummaryProject = () => {
    const newId = Date.now();
    const newProj: SummaryProject = {
      id: newId,
      name: '新项目复盘',
      description: '简要描述这个项目...',
      expanded: true,
      activePhaseId: 1,
      phases: [
        { id: 1, name: '一', timeline: [] }
      ]
    };
    setSummaryProjects([...summaryProjects, newProj]);
    setActiveSummaryProjectId(newId);
  };

  const removeSummaryProject = (id: number) => {
    if (summaryProjects.length <= 1) return;
    const newProjects = summaryProjects.filter(p => p.id !== id);
    setSummaryProjects(newProjects);
    if (activeSummaryProjectId === id) {
      setActiveSummaryProjectId(newProjects[0].id);
    }
  };

  const updateProject = (projectId: number, updater: (proj: SummaryProject) => SummaryProject) => {
    setSummaryProjects(summaryProjects.map(p => p.id === projectId ? updater({ ...p }) : p));
  };

  const addSummaryPhase = (projectId: number) => {
    updateProject(projectId, (proj) => {
      const newPhaseId = Date.now();
      proj.phases = [...proj.phases, { id: newPhaseId, name: '新', timeline: [] }];
      proj.activePhaseId = newPhaseId;
      return proj;
    });
  };

  const removeSummaryPhase = (projectId: number, phaseId: number) => {
    updateProject(projectId, (proj) => {
      if (proj.phases.length > 1) {
        proj.phases = proj.phases.filter(p => p.id !== phaseId);
        if (proj.activePhaseId === phaseId) {
          proj.activePhaseId = proj.phases[0].id;
        }
      }
      return proj;
    });
  };

  const addSummaryTimelineItem = (projectId: number, phaseId: number) => {
    updateProject(projectId, (proj) => {
      const phaseIndex = proj.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const colors = ['bg-[#dfceba]', 'bg-[#c3d4f1]', 'bg-[#f0c8c9]', 'bg-[#d1e7dd]', 'bg-[#fff3cd]'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const newPhases = [...proj.phases];
        newPhases[phaseIndex] = {
          ...newPhases[phaseIndex],
          timeline: [
            ...newPhases[phaseIndex].timeline,
            { time: '新时间点', title: '', desc: '', bgClass: randomColor }
          ]
        };
        proj.phases = newPhases;
      }
      return proj;
    });
  };

  const removeSummaryTimelineItem = (projectId: number, phaseId: number, itemIndex: number) => {
    updateProject(projectId, (proj) => {
      const phaseIndex = proj.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const newPhases = [...proj.phases];
        const newTimeline = [...newPhases[phaseIndex].timeline];
        newTimeline.splice(itemIndex, 1);
        newPhases[phaseIndex] = { ...newPhases[phaseIndex], timeline: newTimeline };
        proj.phases = newPhases;
      }
      return proj;
    });
  };

  const updateTimelineItem = (projectId: number, phaseId: number, itemIndex: number, field: keyof SummaryTimelineItem, value: string) => {
    updateProject(projectId, (proj) => {
      const phaseIndex = proj.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const newPhases = [...proj.phases];
        const newTimeline = [...newPhases[phaseIndex].timeline];
        newTimeline[itemIndex] = { ...newTimeline[itemIndex], [field]: value };
        newPhases[phaseIndex] = { ...newPhases[phaseIndex], timeline: newTimeline };
        proj.phases = newPhases;
      }
      return proj;
    });
  };

  const updatePhaseName = (projectId: number, phaseId: number, newName: string) => {
    updateProject(projectId, (proj) => {
      const phaseIndex = proj.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const newPhases = [...proj.phases];
        newPhases[phaseIndex] = { ...newPhases[phaseIndex], name: newName };
        proj.phases = newPhases;
      }
      return proj;
    });
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pt-4 pb-20 fade-enter-active">
      {/* Header */}
      <div className="px-4">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold text-on-surface mb-1">成败寻常</h2>
        <p className="font-label-md text-label-md text-on-surface-variant/60 uppercase tracking-widest mb-8">归去，也无风雨也无晴</p>
        
        {/* Project Selector */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {summaryProjects.map(proj => (
            <button 
              key={proj.id}
              onClick={() => setActiveSummaryProjectId(proj.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors text-sm font-medium ${
                activeSummaryProjectId === proj.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {proj.name || '未命名项目'}
            </button>
          ))}
          <button 
            onClick={addSummaryProject} 
            className="p-2 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors flex items-center justify-center flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>

        {/* Project Box */}
        {activeSummaryProject && (
          <div className="bg-surface-container-lowest p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/10">
            <input 
              value={activeSummaryProject.name}
              onChange={e => updateProject(activeSummaryProject.id, p => { p.name = e.target.value; return p; })}
              type="text" 
              placeholder="输入项目名称..." 
              className="font-headline-md text-[24px] font-bold text-primary mb-2 bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-full transition-colors" 
            />
            <textarea 
              value={activeSummaryProject.description}
              onChange={e => updateProject(activeSummaryProject.id, p => { p.description = e.target.value; return p; })}
              placeholder="输入项目内容与简介..." 
              rows={2} 
              className="font-body-md text-on-surface/80 w-full bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none overflow-hidden"
            />
            
            <div className="mt-6 flex justify-between items-center">
              <button 
                onClick={() => updateProject(activeSummaryProject.id, p => { p.expanded = !p.expanded; return p; })} 
                className="flex items-center gap-1 px-4 py-2 rounded-full bg-primary-container/10 hover:bg-primary-container/20 text-primary transition-colors font-label-md"
              >
                <span>{activeSummaryProject.expanded ? '收起复盘' : '展开复盘'}</span>
                <span className={`material-symbols-outlined transition-transform duration-300 ${activeSummaryProject.expanded ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {summaryProjects.length > 1 && (
                <button 
                  onClick={() => removeSummaryProject(activeSummaryProject.id)} 
                  className="p-2 text-error/60 hover:text-error hover:bg-error-container rounded-full transition-colors" 
                  title="删除该项目"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {activeSummaryProject && activeSummaryProject.expanded && (
        <div className="w-full slide-fade-enter-active">
          <div className="px-4">
            <div className="flex justify-between items-center mt-8">
              <div className="font-headline-md text-[20px] font-semibold text-on-surface">项目复盘</div>
              <button 
                onClick={() => addSummaryTimelineItem(activeSummaryProject.id, activeSummaryPhase?.id || 0)} 
                className="text-primary hover:bg-primary-container/10 p-1.5 rounded-lg transition-colors flex items-center" 
                title="增加新模块"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
        
            {/* Dynamic Phase Tabs */}
            <div className="flex items-center gap-6 mt-6 border-b border-outline-variant/20 pb-4 text-center text-label-sm font-label-sm text-on-surface-variant/60 overflow-x-auto scrollbar-hide">
              {activeSummaryProject.phases.map(phase => (
                <div 
                  key={phase.id}
                  onClick={() => updateProject(activeSummaryProject.id, p => { p.activePhaseId = phase.id; return p; })}
                  className={`flex flex-col gap-2 cursor-pointer transition-colors px-2 relative group/phase ${activeSummaryProject.activePhaseId === phase.id ? 'text-primary' : 'hover:text-primary'}`}
                >
                  <span>阶段</span>
                  <div className="flex items-center justify-center">
                     {activeSummaryProject.activePhaseId === phase.id ? (
                       <input 
                         value={phase.name} 
                         onChange={e => updatePhaseName(activeSummaryProject.id, phase.id, e.target.value)}
                         className="font-bold text-[15px] bg-transparent border-b border-primary focus:outline-none w-10 text-center text-on-surface" 
                       />
                     ) : (
                       <span className="font-bold text-[15px] text-on-surface">{phase.name}</span>
                     )}
                  </div>
                  {activeSummaryProject.phases.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSummaryPhase(activeSummaryProject.id, phase.id); }} 
                      className="absolute -top-2 -right-4 p-0.5 opacity-0 group-hover/phase:opacity-100 text-error hover:bg-error-container rounded transition-all"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  )}
                </div>
              ))}
              
              <button 
                onClick={() => addSummaryPhase(activeSummaryProject.id)} 
                className="p-1 rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center flex-shrink-0 self-end mb-1" 
                title="增加新阶段"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative px-4 mt-8">
            {activeSummaryPhase && (
              <div className="space-y-8">
                {activeSummaryPhase.timeline.map((item, index) => (
                  <div key={index} className="flex gap-4 md:gap-6 relative z-10 group/time">
                    
                    {/* Time / Period column */}
                    <div className="w-16 md:w-20 pt-5 flex-shrink-0 text-right relative">
                      <input 
                        value={item.time}
                        onChange={e => updateTimelineItem(activeSummaryProject.id, activeSummaryPhase.id, index, 'time', e.target.value)}
                        className="font-label-sm text-label-sm text-on-surface-variant/60 block w-full bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none text-right transition-colors" 
                        placeholder="阶段时间" 
                      />
                      <button 
                        onClick={() => removeSummaryTimelineItem(activeSummaryProject.id, activeSummaryPhase.id, index)} 
                        className="absolute -left-2 top-4 p-1 opacity-0 group-hover/time:opacity-100 text-error hover:bg-error-container rounded transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                    
                    {/* Line separator (dashed) */}
                    <div className="absolute top-[32px] left-0 -z-10 w-full px-[80px] md:px-[100px]">
                      <div className="w-full border-t-2 border-dashed border-outline-variant/20"></div>
                    </div>

                    {/* Card Content */}
                    <div className={`flex-1 rounded-[24px] p-6 md:p-7 transition-transform hover:-translate-y-1 cursor-default shadow-sm ${item.bgClass || 'bg-surface-container-low'}`}>
                      <input 
                        value={item.title}
                        onChange={e => updateTimelineItem(activeSummaryProject.id, activeSummaryPhase.id, index, 'title', e.target.value)}
                        className="font-headline-md text-[18px] md:text-[20px] font-bold mb-2 text-on-surface/90 bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-full transition-colors" 
                        placeholder="模块标题" 
                      />
                      <textarea 
                        value={item.desc}
                        onChange={e => updateTimelineItem(activeSummaryProject.id, activeSummaryPhase.id, index, 'desc', e.target.value)}
                        className="font-body-md text-sm md:text-[15px] text-on-surface/75 leading-relaxed bg-transparent border border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-full transition-colors resize-none overflow-hidden min-h-[60px]" 
                        placeholder="模块内容..." 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
