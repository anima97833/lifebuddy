import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 核心状态同步 Hook：替代原有的 localforage
 * 
 * 功能：
 * 1. 初始化时从后端 Vercel KV 拉取数据（如果不存在则使用 defaultValue）
 * 2. 状态改变时，优先更新本地 React 状态，保证 UI 极致流畅无延迟（乐观更新）
 * 3. 自动加入 Debounce (防抖) 机制，避免用户高频输入时疯狂请求 Vercel KV
 */
export function useSyncState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  
  // 用于追踪是否是初次加载完毕后的改变，防止初始化数据时误触发同步
  const isInitialMount = useRef(true);
  // 定时器引用，用于防抖
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 组件挂载时，从服务端拉取数据
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sync?key=${key}`);
        const result = await res.json();
        
        if (result.data !== null && result.data !== undefined) {
          setState(result.data);
        }
      } catch (error) {
        console.error(`Failed to load ${key} from KV`, error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [key]);

  // 2. 将数据推送到后端的函数
  const syncToBackend = useCallback(async (valueToSync: T) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: valueToSync })
      });
    } catch (error) {
      console.error(`Failed to sync ${key} to KV`, error);
      // NOTE: 在实际业务中，这里可以接入离线队列重试逻辑
    }
  }, [key]);

  // 3. 自定义 setState 函数：拦截原生的 setState，附加上云端同步逻辑
  const setSyncState = useCallback((valueOrFn: T | ((prevState: T) => T)) => {
    setState((prev) => {
      const newValue = valueOrFn instanceof Function ? valueOrFn(prev) : valueOrFn;
      
      // 清除旧的防抖定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // 设置新的防抖定时器，1000ms 内如果没有新变化，则向云端发送保存请求
      debounceTimerRef.current = setTimeout(() => {
        syncToBackend(newValue);
      }, 1000);

      return newValue;
    });
  }, [syncToBackend]);

  return [state, setSyncState, isLoading] as const;
}
