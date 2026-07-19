'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSyncState } from '@/hooks/useSyncState';

interface SubItem {
  id: number;
  name: string;
  price: string;
}

interface CollectionNode {
  id: number;
  name: string;
  items: SubItem[];
}

// Constants for layout
const CX = 400;
const CY = 450;
const R = 250;

function getPos(index: number, total: number) {
  const angle = (360 / Math.max(1, total)) * index - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: CX + R * Math.cos(rad),
    y: CY + R * Math.sin(rad),
  };
}

export default function CollectionsPage() {
  const [baseScale, setBaseScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodesExpanded, setNodesExpanded] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [devicePage, setDevicePage] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchZoom = useRef(1);

  const [nodes, setNodes] = useSyncState<CollectionNode[]>('collectionNodes', [
    { id: 1, name: 'DEVICE', items: [
      { id: 101, name: '设计基础课程', price: '299' },
      { id: 102, name: 'Procreate笔刷', price: '45' }
    ]}
  ]);

  const activeNode = useMemo(() => nodes?.find(n => n.id === activeNodeId) || null, [nodes, activeNodeId]);

  const totalPages = Math.ceil((activeNode?.items?.length || 0) / 4);
  const paginatedItems = useMemo(() => {
    if (!activeNode?.items) return [];
    const start = devicePage * 4;
    return activeNode.items.slice(start, start + 4);
  }, [activeNode, devicePage]);

  const getNodeTotal = (items: SubItem[]) =>
    Number(items.reduce((sum, item) => sum + (Number(item.price) || 0), 0).toFixed(2));

  const grandTotal = Number((nodes || []).reduce((sum, node) => sum + getNodeTotal(node.items), 0).toFixed(2));

  // ── Base responsive scale (initial fit) ──
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setBaseScale(Math.min(1, width / 850));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Wheel zoom (zoom toward cursor) ──
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // Mouse position relative to viewport center
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;

      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setUserZoom(prev => {
        const next = Math.min(5, Math.max(0.2, prev * factor));
        // Adjust pan so zoom targets the mouse point
        setPan(p => ({
          x: mx - (mx - p.x) * (next / prev),
          y: my - (my - p.y) * (next / prev),
        }));
        return next;
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Mouse drag to pan ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag when clicking on interactive diagram elements
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    isDragging.current = true;
    lastPointer.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({ x: e.clientX - lastPointer.current.x, y: e.clientY - lastPointer.current.y });
  }, []);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // ── Touch pinch-to-zoom + single finger pan ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastPinchDist.current = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      lastPinchZoom.current = userZoom;
    } else if (e.touches.length === 1) {
      lastPointer.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  }, [userZoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const next = Math.min(5, Math.max(0.2, lastPinchZoom.current * (dist / lastPinchDist.current)));
      setUserZoom(next);
    } else if (e.touches.length === 1) {
      setPan({ x: e.touches[0].clientX - lastPointer.current.x, y: e.touches[0].clientY - lastPointer.current.y });
    }
  }, []);

  const handleTouchEnd = useCallback(() => { lastPinchDist.current = null; }, []);

  const resetView = () => { setUserZoom(1); setPan({ x: 0, y: 0 }); };

  // ── Node actions ──
  const toggleNodes = () => {
    setNodesExpanded(!nodesExpanded);
    if (nodesExpanded) setActiveNodeId(null);
  };

  const addNode = () => {
    setNodes(prev => [...prev, { id: Date.now(), name: '新节点', items: [] }]);
    if (!nodesExpanded) setNodesExpanded(true);
  };

  const removeActiveNode = () => {
    if (!window.confirm('确定要删除整个节点吗？')) return;
    setNodes(prev => prev.filter(n => n.id !== activeNodeId));
    setActiveNodeId(null);
  };

  const addItemToActiveNode = () => {
    if (!activeNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id !== activeNodeId) return n;
      return { ...n, items: [...n.items, { id: Date.now(), name: '', price: '' }] };
    }));
    const newTotal = (activeNode?.items?.length || 0) + 1;
    setDevicePage(Math.max(0, Math.ceil(newTotal / 4) - 1));
  };

  const removeItemFromActiveNode = (itemId: number) => {
    if (!activeNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id !== activeNodeId) return n;
      return { ...n, items: n.items.filter(item => item.id !== itemId) };
    }));
    const newTotal = (activeNode?.items?.length || 0) - 1;
    const newTotalPages = Math.ceil(newTotal / 4);
    if (devicePage >= newTotalPages && devicePage > 0) setDevicePage(devicePage - 1);
  };

  const updateActiveNodeName = (name: string) => {
    if (!activeNodeId) return;
    setNodes(prev => prev.map(n => n.id === activeNodeId ? { ...n, name } : n));
  };

  const updateItemInActiveNode = (itemId: number, updates: Partial<SubItem>) => {
    if (!activeNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id !== activeNodeId) return n;
      return { ...n, items: n.items.map(item => item.id === itemId ? { ...item, ...updates } : item) };
    }));
  };

  const combinedScale = baseScale * userZoom;

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center px-4 md:px-10 h-16 bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <Link href="/" className="flex items-center text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </Link>

        {/* Zoom Controls */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setUserZoom(z => Math.min(5, z * 1.2))} className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-colors" title="放大">
            <span className="material-symbols-outlined text-[20px]">zoom_in</span>
          </button>
          <button onClick={resetView} className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant text-[12px] font-mono hover:bg-primary hover:text-white transition-colors min-w-[44px] text-center" title="重置视图">
            {Math.round(userZoom * 100)}%
          </button>
          <button onClick={() => setUserZoom(z => Math.max(0.2, z / 1.2))} className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-colors" title="缩小">
            <span className="material-symbols-outlined text-[20px]">zoom_out</span>
          </button>
        </div>
      </header>

      {/* Zoom hint */}
      <div className="text-center text-[11px] text-on-surface-variant/40 py-1 select-none">
        滚轮/双指缩放 · 拖拽移动
      </div>

      {/* Viewport — captures all gestures */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Diagram — centered, then pan + zoom applied */}
        <div
          className="absolute w-[800px] h-[900px]"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: -400,
            marginTop: -450,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${combinedScale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Add Node Button */}
          <button
            onClick={addNode}
            className="absolute top-4 right-4 p-3 bg-primary text-on-primary rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all z-50 flex items-center justify-center"
            title="添加新节点"
          >
            <span className="material-symbols-outlined text-[24px]">add</span>
          </button>

          {/* CUSTOMER Text */}
          <div className={`absolute top-[80px] left-1/2 -translate-x-1/2 font-headline-md font-bold text-on-surface tracking-widest text-lg transition-all duration-500 ease-out ${nodesExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            CUSTOMER
          </div>

          {/* SVG dashed lines */}
          <svg
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ease-in-out ${nodesExpanded ? 'opacity-100' : 'opacity-0'}`}
            viewBox="0 0 800 900"
          >
            {(nodes || []).map((node, i) => {
              const pos = getPos(i, nodes?.length || 1);
              return (
                <line
                  key={`line-${node.id}`}
                  x1={CX} y1={CY}
                  x2={pos.x} y2={pos.y}
                  stroke="var(--color-on-surface-variant)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
              );
            })}
          </svg>

          {/* Dynamic small nodes */}
          {(nodes || []).map((node, i) => {
            const pos = getPos(i, nodes?.length || 1);
            const isActive = activeNodeId === node.id;
            const leftPos = nodesExpanded ? pos.x - 60 : CX - 60;
            const topPos = nodesExpanded ? pos.y - 60 : CY - 60;

            return (
              <div
                key={node.id}
                onClick={() => { setActiveNodeId(isActive ? null : node.id); setDevicePage(0); }}
                className={`absolute flex flex-col items-center justify-center rounded-full bg-surface-container-highest text-on-surface shadow-md transition-all duration-[600ms] ease-out cursor-pointer hover:shadow-lg ${nodesExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'} ${isActive ? 'border-2 border-primary scale-110 shadow-xl' : 'border-4 border-surface'}`}
                style={{ width: 120, height: 120, left: leftPos, top: topPos, zIndex: isActive ? 25 : 20 }}
              >
                <span className="font-label-md font-bold text-[16px] tracking-wider pointer-events-none text-center px-2 truncate w-full">
                  {node.name}
                </span>
                <span className="text-[14px] text-primary font-bold pointer-events-none mt-1">
                  ¥ {getNodeTotal(node.items)}
                </span>
              </div>
            );
          })}

          {/* Popup Card */}
          <div
            className={`absolute bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl backdrop-blur-xl p-5 flex flex-col transition-all duration-300 ease-out z-40 ${activeNodeId && nodesExpanded ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
            style={{ width: 360, left: CX - 180, top: CY - 120 }}
          >
            <div className="flex justify-between items-center mb-4 border-b border-outline-variant/10 pb-3">
              <input
                value={activeNode?.name || ''}
                onChange={e => updateActiveNodeName(e.target.value)}
                placeholder="节点名称"
                className="font-headline-md text-primary font-bold text-[20px] bg-transparent border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none transition-colors w-40"
              />
              <div className="flex items-center gap-1">
                <button onClick={addItemToActiveNode} className="p-1.5 hover:bg-surface-container rounded-lg text-primary transition-colors flex items-center" title="添加新条目">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
                <button onClick={removeActiveNode} className="p-1.5 hover:bg-error-container text-on-surface-variant hover:text-error rounded-lg transition-colors flex items-center ml-2" title="删除此节点">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 min-h-[160px]">
              {paginatedItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-on-surface-variant/40 text-[16px] pt-10">暂无条目数据</div>
              ) : (
                paginatedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group bg-surface-container-low/50 p-2 rounded-lg border border-transparent hover:border-outline-variant/20 transition-all">
                    <button onClick={() => removeItemFromActiveNode(item.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-error hover:bg-error-container rounded transition-all">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                    <input
                      value={item.name}
                      onChange={e => updateItemInActiveNode(item.id, { name: e.target.value })}
                      placeholder="课程/物品名称"
                      className="flex-1 min-w-0 bg-transparent focus:outline-none text-[16px] text-on-surface transition-colors font-medium"
                    />
                    <div className="flex items-center gap-1 w-28 flex-shrink-0 bg-surface-container-highest/50 px-2 py-1 rounded">
                      <span className="text-[15px] text-on-surface-variant/60 font-medium">¥</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => updateItemInActiveNode(item.id, { price: e.target.value })}
                        placeholder="0"
                        className="w-full bg-transparent focus:outline-none text-[16px] text-on-surface text-right font-medium"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center mt-4 pt-2 border-t border-outline-variant/10">
              <button
                onClick={() => setDevicePage(p => Math.max(0, p - 1))}
                disabled={devicePage === 0}
                className="p-1 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <span className="text-[14px] font-medium text-on-surface-variant/60">
                {totalPages > 0 ? `${devicePage + 1} / ${totalPages}` : '0 / 0'}
              </span>
              <button
                onClick={() => setDevicePage(p => Math.min(totalPages - 1, p + 1))}
                disabled={devicePage >= totalPages - 1}
                className="p-1 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Central COMMERCE circle */}
          <div
            onClick={toggleNodes}
            className={`absolute flex flex-col items-center justify-center rounded-full bg-surface-container-highest text-on-surface shadow-xl cursor-pointer transition-all duration-500 z-10 ${nodesExpanded && activeNodeId ? 'scale-90 opacity-40 blur-[2px]' : 'hover:scale-105 active:scale-95 blur-0 opacity-100'}`}
            style={{ width: 220, height: 220, left: CX - 110, top: CY - 110 }}
          >
            <span className="font-headline-lg font-bold text-[24px] tracking-widest pointer-events-none">COMMERCE</span>
            <span className="text-[18px] font-bold text-primary pointer-events-none mt-2 opacity-90 tracking-wide">
              总计 ¥{grandTotal}
            </span>
          </div>

          {/* Circular rings */}
          <div className="absolute left-1/2 top-[450px] -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full border border-on-surface-variant/20 pointer-events-none"></div>
          <div className="absolute left-1/2 top-[450px] -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border border-on-surface-variant/10 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}
