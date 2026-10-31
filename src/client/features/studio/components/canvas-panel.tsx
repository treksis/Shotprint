import { FolderOpen, Maximize, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { edgePath, edgesOf, LANE_X } from '../lib';
import { ITEM_DRAG_TYPE, ITEM_SIZE, LANE_LABEL, type Lane, type StudioItem } from '../types';
import { AssetsDrawer } from './assets-drawer';
import { Inspector } from './inspector';
import { ItemCard } from './item-card';

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN_K = 0.2;
const MAX_K = 2;

export interface CanvasPanelProps {
  items: StudioItem[];
  assets: StudioItem[];
  selectedId: string | null;
  /** Item id to bring into view (set by chat chips). */
  focus: { id: string; n: number } | null;
  /** Bumped when the board should fit everything (project loaded, run finished). */
  fitSignal: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onAddCopy: (source: StudioItem, at?: { x: number; y: number }) => void;
  onDropFiles: (files: File[], at: { x: number; y: number }) => void;
  onRemove: (id: string) => void;
  onAttach: (id: string) => void;
  onDragToChat: (active: boolean) => void;
}

export function CanvasPanel({
  items,
  assets,
  selectedId,
  focus,
  fitSignal,
  onSelect,
  onMove,
  onAddCopy,
  onDropFiles,
  onRemove,
  onAttach,
  onDragToChat,
}: CanvasPanelProps) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0.6 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  const zoomTo = useCallback((factor: number, cx?: number, cy?: number) => {
    setView((v) => {
      const el = viewport.current;
      const px = cx ?? (el ? el.clientWidth / 2 : 0);
      const py = cy ?? (el ? el.clientHeight / 2 : 0);
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const ratio = k / v.k;
      return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });
  }, []);

  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el || items.length === 0) return setView({ x: 0, y: 0, k: 0.6 });
    const minX = 0;
    const minY = Math.min(...items.map((i) => i.y)) - 20;
    const maxX = Math.max(...items.map((i) => i.x + ITEM_SIZE[i.kind].w));
    const maxY = Math.max(...items.map((i) => i.y + ITEM_SIZE[i.kind].h));
    const k = Math.min(1, (el.clientWidth - 48) / (maxX - minX), (el.clientHeight - 96) / (maxY - minY));
    setView({ k, x: 24 - minX * k, y: 64 - minY * k });
  }, [items]);

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  // Ctrl/Cmd + scroll zooms around the pointer, plain scroll pans. Needs a non-passive listener.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        zoomTo(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  // Chat chips ask the board to centre an item.
  useEffect(() => {
    if (!focus) return;
    const item = items.find((i) => i.id === focus.id);
    const el = viewport.current;
    if (!item || !el) return;
    const { w, h } = ITEM_SIZE[item.kind];
    const k = Math.max(viewRef.current.k, 0.7);
    const visibleW = el.clientWidth - (selectedId ? 360 : 0);
    setView({ k, x: visibleW / 2 - (item.x + w / 2) * k, y: el.clientHeight / 2 - (item.y + h / 2) * k });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId || /input|textarea|select/i.test((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') onRemove(selectedId);
      if (e.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, onRemove, onSelect]);

  const toBoard = (clientX: number, clientY: number) => {
    const rect = viewport.current?.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - (rect?.left ?? 0) - v.x) / v.k, y: (clientY - (rect?.top ?? 0) - v.y) / v.k };
  };

  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    onSelect(null);
    const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    const move = (ev: PointerEvent) =>
      setView((v) => ({ ...v, x: start.vx + ev.clientX - start.x, y: start.vy + ev.clientY - start.y }));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startItemDrag = (e: React.PointerEvent<HTMLButtonElement>, item: StudioItem) => {
    e.stopPropagation();
    onSelect(item.id);
    const start = { x: e.clientX, y: e.clientY, ix: item.x, iy: item.y };
    let moved = false;
    const overChat = (x: number, y: number) =>
      document.elementsFromPoint(x, y).some((el) => el.closest('[data-chat-drop]'));
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      const k = viewRef.current.k;
      onMove(item.id, start.ix + dx / k, start.iy + dy / k);
      onDragToChat(overChat(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved && overChat(ev.clientX, ev.clientY)) {
        onMove(item.id, start.ix, start.iy);
        onAttach(item.id);
      }
      onDragToChat(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropActive(false);
    const at = toBoard(e.clientX, e.clientY);
    const id = e.dataTransfer.getData(ITEM_DRAG_TYPE);
    const source = id ? assets.find((a) => a.id === id) : undefined;
    if (source) return onAddCopy(source, at);
    if (e.dataTransfer.files.length) onDropFiles([...e.dataTransfer.files], at);
  };

  const edges = edgesOf(items);
  const selected = items.find((i) => i.id === selectedId);
  // Lane labels sit beside the first item of each lane (items can be moved; the label follows the lane's top row).
  const laneLabels = new Map<Lane, number>();
  for (const i of items) if (!laneLabels.has(i.lane) || i.y < laneLabels.get(i.lane)!) laneLabels.set(i.lane, i.y);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--chrome)]">
      <div
        ref={viewport}
        role="application"
        aria-label="Canvas"
        className={cn('relative min-h-0 flex-1 touch-none overflow-hidden select-none', dropActive && 'bg-muted')}
        style={{
          backgroundImage: 'radial-gradient(var(--control) 1px, transparent 1px)',
          backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onPointerDown={startPan}
        onDragOver={(e) => {
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={onDrop}
      >
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          {[...laneLabels].map(([lane, top]) => (
            <span
              key={lane}
              className="absolute text-[15px] font-medium text-muted-foreground"
              style={{ left: 0, top: top + 8, width: LANE_X - 24, textAlign: 'right' }}
            >
              {LANE_LABEL[lane]}
            </span>
          ))}
          <svg className="absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden="true">
            {edges.map((edge) => {
              const lit = selectedId === edge.from.id || selectedId === edge.to.id;
              return (
                <path
                  key={edge.id}
                  d={edgePath(edge.from, edge.to)}
                  fill="none"
                  stroke={lit ? 'var(--accent)' : 'var(--control)'}
                  strokeOpacity={lit ? 1 : 0.7}
                  strokeWidth={lit ? 2 : 1.25}
                />
              );
            })}
          </svg>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === selectedId}
              aria-label={item.label}
              onPointerDown={(e) => startItemDrag(e, item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(item.id);
              }}
              className="pointer-events-auto absolute cursor-grab touch-none rounded-[12px] focus-visible:outline-2 focus-visible:outline-foreground active:cursor-grabbing studio-item-in"
              style={{ left: item.x, top: item.y }}
            >
              <ItemCard item={item} selected={item.id === selectedId} />
            </button>
          ))}
        </div>

        {items.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div className="max-w-[320px]">
              <p className="text-[16px] font-medium">The canvas is empty</p>
              <p className="mt-1 text-[14px] text-muted-foreground">
                Ask the director for an ad, or drop files from Assets or your desktop.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="pointer-events-auto"
          aria-pressed={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <FolderOpen />
          Assets
        </Button>
        <div className={cn('pointer-events-auto flex items-center rounded-[8px] border border-border bg-background p-0.5', selected && 'mr-[352px]')}>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Zoom out" onClick={() => zoomTo(1 / 1.2)}>
            <Minus />
          </Button>
          <span className="min-w-11 text-center text-[12px] tabular-nums text-muted-foreground">
            {Math.round(view.k * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Zoom in" onClick={() => zoomTo(1.2)}>
            <Plus />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Fit to screen" onClick={fit}>
            <Maximize />
          </Button>
        </div>
      </div>

      {selected && (
        <Inspector
          item={selected}
          items={items}
          onClose={() => onSelect(null)}
          onAttach={onAttach}
          onRemove={onRemove}
          onSelect={onSelect}
        />
      )}

      <AssetsDrawer
        open={drawerOpen}
        assets={assets}
        onClose={() => setDrawerOpen(false)}
        onPick={(asset) => onAddCopy(asset)}
      />
    </div>
  );
}
