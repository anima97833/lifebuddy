'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AIChatAgentProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

interface ApiConfig {
  url: string;
  key: string;
  model: string;
}

interface BotConfig {
  id: string;
  avatar: string;
  name: string;
  age: string;
  gender: string;
  speakingStyle: string;
  personality: string;
}

const AVATAR_OPTIONS = ['🤖', '🧠', '🦊', '🐼', '🌸', '🐉', '⚡', '🎯', '🌙', '🎨', '🔥', '💧', '🌿', '🦁', '🦉'];

function buildSystemPrompt(bot: BotConfig): string {
  return `你是一个叫做「${bot.name}」的AI助手。${bot.age ? `你的年龄设定是 ${bot.age} 岁。` : ''}${bot.gender ? `性别：${bot.gender}。` : ''}${bot.speakingStyle ? `你的说话方式是：${bot.speakingStyle}。` : ''}${bot.personality ? `人物设定：${bot.personality}。` : ''}

【重要系统指令】：
1. 为了保持真实感，你每次回复**必须**将其拆分为至少 3 条独立的简短消息（模仿真人发微信的习惯，不要一次发一大段）。
2. 在每条独立的消息之间，使用 \`|||\` 作为分隔符。
例如：好的呀，等我一下哈|||我查到了！|||大概需要三百多块钱。
请严格遵守分隔符指令，始终保持角色设定。`;
}

export function AIChatAgent({ isOpen, onClose }: AIChatAgentProps) {
  const [view, setView] = useState<'chat' | 'apiConfig' | 'botList' | 'botConfig'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. API 配置
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('aiChatConfig'); if (s) return JSON.parse(s); } catch {}
    }
    return { url: 'https://api.openai.com/v1', key: '', model: 'gpt-4o-mini' };
  });

  // 2. 机器人列表与激活状态
  const [bots, setBots] = useState<BotConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('aiBots'); if (s) return JSON.parse(s); } catch {}
    }
    return [{ id: 'default', avatar: '🤖', name: 'Aria', age: '', gender: '', speakingStyle: '温柔体贴，喜欢用emoji', personality: '你是用户的贴心生活助理，善于倾听，给出有温度的建议。' }];
  });
  
  const [activeBotId, setActiveBotId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try { const id = localStorage.getItem('aiActiveBotId'); if (id) return id; } catch {}
    }
    return 'default';
  });

  // 3. 独立聊天历史
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('aiChatHistories'); if (s) return JSON.parse(s); } catch {}
    }
    return {};
  });

  const activeBot = bots.find(b => b.id === activeBotId) || bots[0];
  const currentMessages = chatHistories[activeBot.id] || [];

  const updateCurrentMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setChatHistories(prev => {
      const prevMsgs = prev[activeBot.id] || [];
      const nextMsgs = typeof updater === 'function' ? updater(prevMsgs) : updater;
      const limited = nextMsgs.slice(-100);
      const nextState = { ...prev, [activeBot.id]: limited };
      if (typeof window !== 'undefined') localStorage.setItem('aiChatHistories', JSON.stringify(nextState));
      return nextState;
    });
  };

  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editingBotData, setEditingBotData] = useState<BotConfig>(activeBot);

  const [apiSaveMsg, setApiSaveMsg] = useState('');
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiBots', JSON.stringify(bots));
      localStorage.setItem('aiActiveBotId', activeBot.id);
    }
  }, [bots, activeBot.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading, view]);

  // Welcome message when first opened a bot
  useEffect(() => {
    if (isOpen && currentMessages.length === 0) {
      updateCurrentMessages([{
        id: Date.now(),
        role: 'assistant',
        content: `你好！我是 ${activeBot.name} ${activeBot.avatar}，有什么我可以帮你的吗？`
      }]);
    }
  }, [isOpen, activeBot.id, currentMessages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: text };
    
    // 更新本地记录并获取最新列表
    let currentMsgsSnap: Message[] = [];
    updateCurrentMessages(prev => {
      currentMsgsSnap = [...prev, userMsg].slice(-100);
      return currentMsgsSnap;
    });

    setInputText('');
    setIsLoading(true);

    try {
      const base = apiConfig.url.replace(/\/+$/, '');
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiConfig.key}`,
        },
        body: JSON.stringify({
          model: apiConfig.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: buildSystemPrompt(activeBot) },
            ...currentMsgsSnap.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '（暂无回复）';
      
      const parts = reply.split('|||').map((s: string) => s.trim()).filter(Boolean);
      
      for (let i = 0; i < parts.length; i++) {
        const delay = i === 0 ? 0 : Math.random() * 800 + 600;
        if (delay > 0) {
          setIsLoading(true);
          await new Promise(r => setTimeout(r, delay));
        }
        setIsLoading(false);
        updateCurrentMessages(prev => [...prev, { id: Date.now() + i, role: 'assistant', content: parts[i] }]);
      }

    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updateCurrentMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `⚠️ 请求失败：${errMsg.slice(0, 120)}\n\n请检查 API 配置是否正确。`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const base = apiConfig.url.replace(/\/+$/, '');
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${apiConfig.key}` },
      });
      const data = await res.json();
      const ids = (data.data || data.models || []).map((m: { id?: string; name?: string }) => m.id || m.name || '').filter(Boolean);
      setAvailableModels(ids.length > 0 ? ids : ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-5', 'deepseek-chat']);
    } catch {
      setAvailableModels(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-sonnet-4-5', 'deepseek-chat']);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSaveBot = () => {
    if (editingBotId === 'new') {
      const newBot = { ...editingBotData, id: Date.now().toString() };
      setBots(p => [...p, newBot]);
      setActiveBotId(newBot.id);
    } else {
      setBots(p => p.map(b => b.id === editingBotId ? editingBotData : b));
    }
    setView('botList');
  };

  const handleDeleteBot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBots = bots.filter(b => b.id !== id);
    if (newBots.length === 0) {
      alert('至少保留一个机器人！');
      return;
    }
    setBots(newBots);
    if (activeBotId === id) {
      setActiveBotId(newBots[0].id);
    }
    // 可选：清理对应的聊天记录
    setChatHistories(prev => {
      const next = { ...prev };
      delete next[id];
      if (typeof window !== 'undefined') localStorage.setItem('aiChatHistories', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div
      className={`absolute bottom-16 right-0 w-[340px] max-sm:w-[310px] bg-[#f0ede8] rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 origin-bottom-right z-50 flex flex-col ${isOpen ? 'scale-100 max-sm:scale-[0.65] opacity-100 pointer-events-auto' : 'scale-50 opacity-0 pointer-events-none'}`}
      style={{ height: 480 }}
    >
      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="absolute inset-0 z-40 bg-black/5" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sliding Sidebar */}
      <div
        className={`absolute top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col transition-all duration-300 ease-out rounded-r-3xl ${isSidebarOpen ? 'w-[160px] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
      >
        <div className="p-4 pt-6 flex flex-col gap-2 min-w-[160px]">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">选项</p>
          <button onClick={() => { setView('apiConfig'); setIsSidebarOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-700 text-[13px] font-medium">
            <span className="material-symbols-outlined text-[18px] text-gray-400">settings</span>API 配置
          </button>
          <button onClick={() => { setView('botList'); setIsSidebarOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-700 text-[13px] font-medium">
            <span className="material-symbols-outlined text-[18px] text-gray-400">swap_horiz</span>切换
          </button>
          <div className="border-t border-gray-100 my-2" />
          <button onClick={() => { updateCurrentMessages([]); setIsSidebarOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-red-400 text-[13px] font-medium">
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>清空记录
          </button>
        </div>
      </div>

      {/* ═══ CHAT VIEW ═══ */}
      {view === 'chat' && (
        <>
          <div className="flex items-center justify-between px-4 py-3 bg-[#edebe6] border-b border-black/5 flex-shrink-0">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>
            <button onClick={() => { setEditingBotId(activeBot.id); setEditingBotData(activeBot); setView('botConfig'); }} className="flex flex-col items-center hover:opacity-80 transition-opacity">
              <span className="text-[22px] leading-none">{activeBot.avatar}</span>
              <span className="text-[12px] font-semibold text-gray-800 mt-0.5">{activeBot.name}</span>
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-gray-800 transition-colors">
              <span className="material-symbols-outlined text-[22px]">more_horiz</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {currentMessages.map(msg => (
              <div key={msg.id} className={`flex gap-2 items-end ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 flex items-center justify-center text-[18px] flex-shrink-0 mb-0.5">{activeBot.avatar}</div>
                )}
                <div
                  className={`max-w-[72%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#7bca5e] text-gray-900 rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-end">
                <div className="w-8 h-8 flex items-center justify-center text-[18px] flex-shrink-0 mb-0.5">{activeBot.avatar}</div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f7f5f0] border-t border-black/5 flex-shrink-0">
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="输入消息…"
              className="flex-1 bg-white rounded-xl px-3 py-2 text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300 border border-black/5"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="w-9 h-9 flex items-center justify-center bg-[#7bca5e] hover:bg-[#6bb84e] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </>
      )}

      {/* ═══ API CONFIG VIEW ═══ */}
      {view === 'apiConfig' && (
        <>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#edebe6] border-b border-black/5 flex-shrink-0">
            <button onClick={() => setView('chat')} className="text-gray-500 hover:text-gray-800 transition-colors">
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <span className="font-bold text-gray-900 text-[15px]">API 配置</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">API URL</label>
              <input type="url" value={apiConfig.url} onChange={e => setApiConfig(p => ({ ...p, url: e.target.value }))} placeholder="https://api.openai.com/v1" className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">API Key</label>
              <input type="password" value={apiConfig.key} onChange={e => setApiConfig(p => ({ ...p, key: e.target.value }))} placeholder="sk-..." className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">模型</label>
              <div className="flex gap-2">
                <select value={apiConfig.model} onChange={e => setApiConfig(p => ({ ...p, model: e.target.value }))} className="flex-1 text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300">
                  <option value="">-- 选择模型 --</option>
                  {(availableModels.length > 0 ? availableModels : ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-5', 'deepseek-chat']).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button onClick={handleFetchModels} disabled={isFetchingModels} className="px-3 py-2 bg-gray-100 hover:bg-green-50 border border-gray-200 rounded-xl text-gray-500 hover:text-green-700 transition-colors disabled:opacity-50">
                  <span className={`material-symbols-outlined text-[18px] ${isFetchingModels ? 'animate-spin' : ''}`}>refresh</span>
                </button>
              </div>
            </div>
            <button onClick={() => { localStorage.setItem('aiChatConfig', JSON.stringify(apiConfig)); setApiSaveMsg('✓ 已保存'); setTimeout(() => setApiSaveMsg(''), 2000); }} className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-[14px] font-semibold rounded-xl transition-colors">
              {apiSaveMsg || '保存配置'}
            </button>
          </div>
        </>
      )}

      {/* ═══ BOT LIST VIEW ═══ */}
      {view === 'botList' && (
        <>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#edebe6] border-b border-black/5 flex-shrink-0">
            <button onClick={() => setView('chat')} className="text-gray-500 hover:text-gray-800 transition-colors">
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <span className="font-bold text-gray-900 text-[15px]">机器人列表</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-2">
            {bots.map(bot => (
              <div 
                key={bot.id} 
                onClick={() => { setActiveBotId(bot.id); setView('chat'); }}
                className={`flex items-center justify-between p-3 rounded-2xl bg-white border cursor-pointer transition-all ${activeBotId === bot.id ? 'border-green-400 shadow-sm ring-1 ring-green-400' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-[28px] leading-none">{bot.avatar}</div>
                  <div>
                    <div className="text-[14px] font-bold text-gray-800">{bot.name}</div>
                    <div className="text-[11px] text-gray-400 truncate max-w-[150px] mt-0.5">{bot.speakingStyle || bot.personality}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditingBotId(bot.id); setEditingBotData(bot); setView('botConfig'); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={(e) => handleDeleteBot(bot.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <button 
                onClick={() => { 
                  setEditingBotId('new'); 
                  setEditingBotData({ id: '', avatar: '🤖', name: '新机器人', age: '', gender: '', speakingStyle: '', personality: '' }); 
                  setView('botConfig'); 
                }} 
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-100 transition-colors text-[14px] font-semibold"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>新增机器人
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ BOT CONFIG VIEW ═══ */}
      {view === 'botConfig' && (
        <>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#edebe6] border-b border-black/5 flex-shrink-0">
            <button onClick={() => setView(editingBotId === 'new' ? 'botList' : 'chat')} className="text-gray-500 hover:text-gray-800 transition-colors">
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <span className="font-bold text-gray-900 text-[15px]">{editingBotId === 'new' ? '新增机器人' : '编辑机器人设定'}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-2">头像</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map(av => (
                  <button key={av} onClick={() => setEditingBotData(p => ({ ...p, avatar: av }))} className={`w-10 h-10 rounded-xl text-[22px] flex items-center justify-center transition-all ${editingBotData.avatar === av ? 'bg-green-100 ring-2 ring-green-400 scale-110' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>
                    {av}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">名字</label>
              <input value={editingBotData.name} onChange={e => setEditingBotData(p => ({ ...p, name: e.target.value }))} placeholder="Aria" className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">年龄</label>
                <input type="number" value={editingBotData.age} onChange={e => setEditingBotData(p => ({ ...p, age: e.target.value }))} placeholder="25" className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">性别</label>
                <select value={editingBotData.gender} onChange={e => setEditingBotData(p => ({ ...p, gender: e.target.value }))} className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300">
                  <option value="">不设定</option>
                  <option value="女性">女性</option>
                  <option value="男性">男性</option>
                  <option value="中性">中性</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">说话方式</label>
              <input value={editingBotData.speakingStyle} onChange={e => setEditingBotData(p => ({ ...p, speakingStyle: e.target.value }))} placeholder="温柔体贴，爱用emoji…" className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">人物设定</label>
              <textarea value={editingBotData.personality} onChange={e => setEditingBotData(p => ({ ...p, personality: e.target.value }))} placeholder="描述这个AI的背景故事、性格特点…" rows={3} className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" />
            </div>
            <button onClick={handleSaveBot} className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-[14px] font-semibold rounded-xl transition-colors">
              保存设定
            </button>
          </div>
        </>
      )}
    </div>
  );
}
