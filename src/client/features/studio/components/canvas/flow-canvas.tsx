import { LayoutGrid, Maximize, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { edgePath, laneBoxes } from '../../lib';
import { DEFAULT_EDGE, EDGE_STYLE, LANE_LABEL, NODE_SIZE, type StudioEdge, type StudioNode } from '../../types';
import { Inspector } from './inspector';
import { NodeCard } from './node-card';

interface View {
  x: number;
  y: number;
  k: number;
}
const MIN_K = 0.15;
const MAX_K = 1.6;

export interface FlowCanvasProps {
  nodes: StudioNode[];
  edges: StudioEdge[];
  selectedId: string | null;
  focus: { id: string; n: number } | null;
  fitSignal: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onTidy: () => void;
  onAttach: (id: string) => void;
}

/** The project as a node graph: pipeline lanes left to right, every input drawn port to port. */
export function FlowCanvas({ nodes, edges, selectedId, focus, fitSignal, onSelect, onMove, onTidy, onAttach }: FlowCanvasProps) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>({ x: 40, y: 60, k: 0.5 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const visibleEdges = useMemo(() => edges.filter((e) => byId.has(e.from) && byId.has(e.to)), [edges, byId]);
  const active = hoverId ?? selectedId;
  const relatedIds = useMemo(() => {
    const s = new Set<string>();
    if (!active) return s;
    for (const e of visibleEdges) {
      if (e.from === active) s.add(e.to);
      if (e.to === active) s.add(e.from);
    }
    return s;
  }, [active, visibleEdges]);

  const zoomTo = useCallback((factor: number, cx?: number, cy?: number) => {
    setView((v) => {
      const el = viewport.current;
      const px = cx ?? (el ? el.clientWidth / 2 : 0);
      const py = cy ?? (el ? el.clientHeight / 2 : 0);
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const r = k / v.k;
      return { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r };
    });
  }, []);

  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el || nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.x)) - 24;
    const minY = Math.min(...nodes.map((n) => n.y)) - 56;
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_SIZE[n.kind].w)) + 24;
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_SIZE[n.kind].h)) + 24;
    const availW = el.clientWidth - (selectedId ? 380 : 0);
    const k = Math.min(1, Math.max(MIN_K, Math.min((availW - 48) / (maxX - minX), (el.clientHeight - 120) / (maxY - minY))));
    setView({ k, x: (availW - (maxX - minX) * k) / 2 - minX * k, y: 64 + (el.clientHeight - 120 - (maxY - minY) * k) / 2 - minY * k });
  }, [nodes, selectedId]);

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoomTo(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  useEffect(() => {
    if (!focus) return;
    const n = byId.get(focus.id);
    const el = viewport.current;
    if (!n || !el) return;
    const { w, h } = NODE_SIZE[n.kind];
    const k = Math.max(viewRef.current.k, 0.75);
    const availW = el.clientWidth - 380;
    setView({ k, x: availW / 2 - (n.x + w / 2) * k, y: el.clientHeight / 2 - (n.y + h / 2) * k });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/input|textarea/i.test((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelect]);

  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    onSelect(null);
    const s = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    const move = (ev: PointerEvent) => setView((v) => ({ ...v, x: s.vx + ev.clientX - s.x, y: s.vy + ev.clientY - s.y }));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startDrag = (e: React.PointerEvent, n: StudioNode) => {
    e.stopPropagation();
    onSelect(n.id);
    const s = { x: e.clientX, y: e.clientY, nx: n.x, ny: n.y };
    let moved = false;
    const overChat = (x: number, y: number) => document.elementsFromPoint(x, y).some((el) => el.closest('[data-chat-drop]'));
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - s.x;
      const dy = ev.clientY - s.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      onMove(n.id, s.nx + dx / viewRef.current.k, s.ny + dy / viewRef.current.k);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved && overChat(ev.clientX, ev.clientY)) {
        onMove(n.id, s.nx, s.ny);
        onAttach(n.id);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const boxes = laneBoxes(nodes);
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const legend = [EDGE_STYLE['first + last frame'], EDGE_STYLE['guide audio'], EDGE_STYLE.reference, DEFAULT_EDGE].filter(
    (s) => visibleEdges.some((e) => (EDGE_STYLE[e.role] ?? DEFAULT_EDGE) === s)
  );

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <div
        ref={viewport}
        role="application"
        aria-label="Production canvas"
        className="relative min-h-0 flex-1 touch-none overflow-hidden select-none"
        style={{
          backgroundImage: 'radial-gradient(#d9d9d5 1px, transparent 1px)',
          backgroundSize: `${22 * view.k}px ${22 * view.k}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onPointerDown={startPan}
      >
        <div className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          {boxes.map((b) => (
            <div key={b.lane} className="absolute rounded-[20px] border border-[#ebebe8] bg-[#ffffff]/60" style={{ left: b.x - 16, top: b.y - 48, width: b.w + 32, height: b.h + 64 }}>
              <span className="absolute top-3.5 left-4 text-[14px] font-medium text-muted-foreground">
                {LANE_LABEL[b.lane]}
                <span className="ml-1.5 tabular-nums text-[#a3a3a0]">{nodes.filter((n) => n.lane === b.lane).length}</span>
              </span>
            </div>
          ))}

          <svg className="absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden="true">
            {visibleEdges.map((e) => {
              const from = byId.get(e.from)!;
              const to = byId.get(e.to)!;
              const s = EDGE_STYLE[e.role] ?? DEFAULT_EDGE;
              const lit = active === e.from || active === e.to;
              const pending = to.status === 'pending' || to.status === 'running';
              const { d } = edgePath(from, to);
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={d}
                  fill="none"
                  stroke={lit ? (s === DEFAULT_EDGE ? 'var(--ink)' : s.stroke) : s.stroke}
                  strokeWidth={lit ? s.width + 0.8 : s.width}
                  strokeDasharray={pending ? '3 5' : s.dash}
                  strokeOpacity={active && !lit ? 0.18 : lit ? 1 : 0.55}
                  className={cn(pending && 'studio-edge-flow')}
                />
              );
            })}
          </svg>

          {active &&
            visibleEdges
              .filter((e) => e.from === active || e.to === active)
              .map((e) => {
                const { mid } = edgePath(byId.get(e.from)!, byId.get(e.to)!);
                return (
                  <span
                    key={`l-${e.from}-${e.to}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[6px] border border-border bg-background px-1.5 py-0.5 text-[11px] whitespace-nowrap text-foreground"
                    style={{ left: mid.x, top: mid.y }}
                  >
                    {e.role}
                  </span>
                );
              })}

          {nodes.map((n) => {
            const hasIn = visibleEdges.some((e) => e.to === n.id);
            const hasOut = visibleEdges.some((e) => e.from === n.id);
            const { h } = NODE_SIZE[n.kind];
            return (
              <div key={n.id} className="studio-node-in absolute" style={{ left: n.x, top: n.y }}>
                <button
                  type="button"
                  aria-pressed={n.id === selectedId}
                  aria-label={`${n.label}${n.status !== 'done' ? `, ${n.status}` : ''}`}
                  onPointerDown={(e) => startDrag(e, n)}
                  onPointerEnter={() => setHoverId(n.id)}
                  onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelect(n.id);
                  }}
                  className="pointer-events-auto block cursor-grab rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:cursor-grabbing"
                >
                  <NodeCard node={n} selected={n.id === selectedId} related={relatedIds.has(n.id)} />
                </button>
                {hasIn && <span className="absolute -left-[5px] size-[10px] rounded-full border-2 border-background bg-[#9a9a96]" style={{ top: h / 2 - 5 }} />}
                {hasOut && <span className="absolute -right-[5px] size-[10px] rounded-full border-2 border-background bg-[#9a9a96]" style={{ top: NODE_SIZE[n.kind].h / 2 - 5 }} />}
              </div>
            );
          })}
        </div>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="text-[14px] text-muted-foreground">Nodes appear here as the director works.</p>
          </div>
        )}
      </div>

      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-[10px] border border-border bg-background p-0.5">
        <button type="button" aria-label="Zoom out" onClick={() => zoomTo(1 / 1.2)} className="grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
          <Minus className="size-4" />
        </button>
        <span className="w-11 text-center text-[12px] tabular-nums text-muted-foreground">{Math.round(view.k * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => zoomTo(1.2)} className="grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
          <Plus className="size-4" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <button type="button" aria-label="Fit to screen" title="Fit" onClick={fit} className="grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
          <Maximize className="size-4" />
        </button>
        <button type="button" aria-label="Tidy up" title="Tidy up" onClick={onTidy} className="grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
          <LayoutGrid className="size-4" />
        </button>
      </div>

      {legend.length > 0 && (
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[10px] border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
          {legend.map((s) => (
            <span key={s.legend} className="inline-flex items-center gap-2">
              <svg width="26" height="6" aria-hidden="true">
                <line x1="0" y1="3" x2="26" y2="3" stroke={s.stroke} strokeWidth={2} strokeDasharray={s.dash} />
              </svg>
              {s.legend}
            </span>
          ))}
        </div>
      )}

      {selected && (
        <Inspector node={selected} nodes={nodes} edges={visibleEdges} onClose={() => onSelect(null)} onSelect={onSelect} onAttach={onAttach} />
      )}
    </div>
  );
}
