'use client';

import React from 'react';
import { useSyncState } from '@/hooks/useSyncState';

interface SkillItem {
  name: string;
  url: string;
  duration: number | string;
}

interface Skill {
  title: string;
  subtitle: string;
  icon: string;
  categoryId: number | null;
  expanded: boolean;
  items: SkillItem[];
}

interface SkillCategory {
  id: number;
  name: string;
  targetHours: number; // 目标时长，用于计算进度百分比
  last: string;
  // progress 字段废弃，由系统动态计算
}

export function SkillBoard() {
  const [skillCategories, setSkillCategories] = useSyncState<SkillCategory[]>('skillCategories', [
    { id: 1, name: '数字插画', targetHours: 100, last: '2天前' },
    { id: 2, name: '品牌策略', targetHours: 100, last: '今天' }
  ]);

  const [skills, setSkills] = useSyncState<Skill[]>('skills', [
    {
      title: '色彩理论项目',
      subtitle: '下次练习: 明天, 9:00 AM',
      icon: 'palette',
      categoryId: 1,
      expanded: false,
      items: [
        { name: '色彩理论基础教程', url: 'https://bilibili.com/', duration: 45 }
      ]
    }
  ]);

  const addSkillCategory = () => {
    setSkillCategories(prev => [...prev, { id: Date.now(), name: '新种类', targetHours: 100, last: '刚刚' }]);
  };

  const removeSkillCategory = (index: number) => {
    if (!window.confirm("确定要删除这个技能种类吗？")) return;
    setSkillCategories(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const getCategoryTimeInfo = (catId: number | null) => {
    if (!skills) return { totalMinutes: 0, hoursStr: "0.0" };
    let totalMinutes = 0;
    skills.forEach(skill => {
      if (skill.categoryId === catId) {
        skill.items.forEach(item => {
          totalMinutes += Number(item.duration) || 0;
        });
      }
    });
    return { totalMinutes, hoursStr: (totalMinutes / 60).toFixed(1) };
  };

  const addSkill = () => {
    setSkills(prev => [
      ...prev,
      {
        title: '新技能项目',
        subtitle: '下次练习: 待定',
        icon: 'star',
        categoryId: null,
        expanded: true,
        items: []
      }
    ]);
  };

  const removeSkill = (index: number) => {
    if (!window.confirm("确定要删除这个技能项目吗？")) return;
    setSkills(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const addSkillItem = (skillIndex: number) => {
    setSkills(prev => {
      const copy = [...prev];
      copy[skillIndex].items.push({ name: '', url: '', duration: '' });
      return copy;
    });
  };

  const removeSkillItem = (skillIndex: number, itemIndex: number) => {
    if (!window.confirm("确定要删除这个技能条目吗？")) return;
    setSkills(prev => {
      const copy = [...prev];
      copy[skillIndex].items.splice(itemIndex, 1);
      return copy;
    });
  };

  return (
    <div className="space-y-6">
      {/* Skill Milestones Card */}
      <div className="bg-surface-container-highest p-8 rounded-xl border border-outline-variant/10 soft-shadow relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline-md text-headline-md text-primary">技能里程碑</h3>
          <button onClick={addSkillCategory} className="p-1.5 rounded-lg bg-primary-container/10 hover:bg-primary-container/20 text-primary transition-colors flex items-center justify-center" title="添加技能种类">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
        <div className="space-y-4">
          {(skillCategories || []).map((cat, index) => (
            <div key={index} className="space-y-2 group relative">
              <button onClick={() => removeSkillCategory(index)} className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-error hover:bg-error-container rounded transition-all">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
              <div className="flex justify-between items-end">
                <input 
                  value={cat.name}
                  onChange={e => {
                    setSkillCategories(prev => {
                      const copy = [...prev];
                      copy[index].name = e.target.value;
                      return copy;
                    });
                  }}
                  className="font-label-md text-label-md text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-32 transition-colors"
                />
                <div className="font-label-sm text-label-sm text-on-surface-variant/60 bg-transparent text-right flex items-center justify-end gap-1">
                  <span>累计 {getCategoryTimeInfo(cat.id).hoursStr}h /</span>
                  <input 
                    type="number"
                    min="1"
                    value={cat.targetHours || 100}
                    onChange={e => {
                      setSkillCategories(prev => {
                        const copy = [...prev];
                        copy[index].targetHours = Number(e.target.value);
                        return copy;
                      });
                    }}
                    className="w-10 bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none transition-colors text-right"
                    title="设置目标时长(小时)"
                  />
                  <span>h</span>
                </div>
              </div>
              <div className="w-full h-2 bg-background rounded-full overflow-hidden flex items-center">
                {(() => {
                  const { totalMinutes } = getCategoryTimeInfo(cat.id);
                  const targetMins = (cat.targetHours || 100) * 60;
                  const calculatedProgress = Math.min(100, Math.max(0, (totalMinutes / targetMins) * 100));
                  return (
                    <div 
                      className="h-full bg-primary-container transition-all duration-500 ease-out" 
                      style={{ width: `${calculatedProgress}%` }}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between">
                <input 
                  value={cat.last}
                  onChange={e => {
                    setSkillCategories(prev => {
                      const copy = [...prev];
                      copy[index].last = e.target.value;
                      return copy;
                    });
                  }}
                  className="text-[10px] text-on-surface-variant/50 bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none w-24 transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills List */}
      <div className="space-y-4 relative">
        <div className="flex justify-end absolute -top-10 right-0 z-10">
          <button onClick={addSkill} className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 text-on-surface-variant transition-colors flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="text-sm font-medium">添加技能项目</span>
          </button>
        </div>
        
        {(skills || []).map((skill, sIdx) => (
          <section key={sIdx} className="py-4 border-t border-outline-variant/10 soft-shadow w-full relative group">
            <button onClick={() => removeSkill(sIdx)} className="absolute right-0 top-4 p-1.5 opacity-0 group-hover:opacity-100 text-error hover:bg-error-container rounded transition-all z-10">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <div className="space-y-4">
              <div className="flex gap-4 cursor-pointer items-start md:items-center transition-transform hover:-translate-y-1 w-full md:w-[90%]" 
                   onClick={() => {
                     setSkills(prev => {
                       const copy = [...prev];
                       copy[sIdx].expanded = !copy[sIdx].expanded;
                       return copy;
                     });
                   }}>
                <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-tertiary-fixed">{skill.icon}</span>
                </div>
                <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
                  <input 
                    value={skill.title}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      setSkills(prev => {
                        const copy = [...prev];
                        copy[sIdx].title = e.target.value;
                        return copy;
                      });
                    }}
                    className="font-headline-md text-label-md text-primary bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none transition-colors w-full md:w-1/2"
                  />
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <select 
                      value={skill.categoryId || ''}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        setSkills(prev => {
                          const copy = [...prev];
                          copy[sIdx].categoryId = e.target.value ? Number(e.target.value) : null;
                          return copy;
                        });
                      }}
                      className="text-[10px] text-primary bg-surface-container-low rounded px-1 py-0.5 outline-none border border-outline-variant/20 hover:border-primary cursor-pointer flex-shrink-0"
                    >
                      {(skillCategories || []).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      <option value="">未关联种类</option>
                    </select>
                    <input 
                      value={skill.subtitle}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        setSkills(prev => {
                          const copy = [...prev];
                          copy[sIdx].subtitle = e.target.value;
                          return copy;
                        });
                      }}
                      className="text-label-sm text-on-surface-variant/50 bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none transition-colors flex-1 min-w-[100px] md:w-40"
                    />
                  </div>
                </div>
                <span className={`material-symbols-outlined text-on-surface-variant/50 transition-transform duration-300 ml-auto flex-shrink-0 mt-2 md:mt-0 ${skill.expanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>

              {/* Expandable List */}
              {skill.expanded && (
                <div className="pl-4 md:pl-16 space-y-4">
                  {skill.items.map((item, index) => (
                    <div key={index} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 bg-surface-container-lowest/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <button onClick={(e) => { e.stopPropagation(); removeSkillItem(sIdx, index); }} className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-error-container rounded-md transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                        <input 
                          value={item.name}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            setSkills(prev => {
                              const copy = [...prev];
                              copy[sIdx].items[index].name = e.target.value;
                              return copy;
                            });
                          }}
                          type="text" 
                          placeholder="名称" 
                          className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm flex-1 md:w-32 lg:w-48 focus:outline-none focus:border-primary-container text-on-surface placeholder:text-on-surface-variant/40" 
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:flex-1 pl-8 md:pl-0">
                        <span className="hidden md:inline text-on-surface-variant/40">-</span>
                        <input 
                          value={item.url}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            setSkills(prev => {
                              const copy = [...prev];
                              copy[sIdx].items[index].url = e.target.value;
                              return copy;
                            });
                          }}
                          type="text" 
                          placeholder="链接" 
                          className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:border-primary-container text-on-surface placeholder:text-on-surface-variant/40" 
                        />
                        <input 
                          value={item.duration}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            setSkills(prev => {
                              const copy = [...prev];
                              copy[sIdx].items[index].duration = Number(e.target.value);
                              return copy;
                            });
                          }}
                          type="number" 
                          placeholder="分钟" 
                          className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm w-20 flex-shrink-0 focus:outline-none focus:border-primary-container text-on-surface placeholder:text-on-surface-variant/40" 
                          title="看课时长" 
                        />
                        <a href={item.url} onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(item.url, '_system');
                        }} className="p-1.5 rounded-lg bg-primary-container text-white hover:bg-primary transition-colors flex-shrink-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </a>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Button */}
                  <button onClick={(e) => { e.stopPropagation(); addSkillItem(sIdx); }} className="flex items-center gap-2 text-on-surface-variant/60 hover:text-primary transition-colors py-2">
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span className="text-sm">添加新条目</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
