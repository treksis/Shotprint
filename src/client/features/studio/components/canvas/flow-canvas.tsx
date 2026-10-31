import '@xyflow/react/dist/style.css';
import {
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore as useFlowStore,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import { LayoutGrid, Maximize, Minus, Plus, Redo2, Undo2 } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadToProject } from '../../api';
import { useStore } from 'zustand';
import { cn } from '@/lib/utils';
import { laneBoxes } from '../../lib';
import { history, useCanvasEdges, useCanvasNodes, useStudio } from '../../store';
import { DEFAULT_EDGE, EDGE_STYLE, LANE_LABEL, NODE_SIZE, type Lane, type StudioNode } from '../../types';
import { Inspector } from './inspector';
import { NodeCard } from './node-card';

type StudioRFNode = Node<{ node: StudioNode; related: boolean }, 'studio'>;
type LaneRFNode = Node<{ lane: Lane; count: number }, 'lane'>;
type RoleRFEdge = Edge<{ role: string; pending: boolean; lit: boolean; dim: boolean }, 'role'>;

const StudioNodeView = memo(({ data, selected }: NodeProps<StudioRFNode>) => (
  <>
    <Handle type="target" position={Position.Left} className="studio-handle" />
    <NodeCard node={data.node} selected={!!selected} related={data.related} />
    <Handle type="source" position={Position.Right} className="studio-handle" />
  </>
));

const LaneNodeView = memo(({ data, width, height }: NodeProps<LaneRFNode>) => (
  <div className="rounded-[20px] border border-[#ebebe8] bg-[#ffffff]/60" style={{ width, height }}>
    <span className="absolute top-3.5 left-4 text-[14px] font-medium text-muted-foreground">
      {LANE_LABEL[data.lane]}
      <span className="ml-1.5 tabular-nums text-[#a3a3a0]">{data.count}</span>
    </span>
  </div>
));

const RoleEdgeView = memo(({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<RoleRFEdge>) => {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.35 });
  const s = (data && EDGE_STYLE[data.role]) ?? DEFAULT_EDGE;
  const lit = selected || data?.lit;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={cn(data?.pending && 'studio-edge-flow')}
        style={{
          stroke: lit && s === DEFAULT_EDGE ? 'var(--ink)' : s.stroke,
          strokeWidth: lit ? s.width + 0.8 : s.width,
          strokeDasharray: data?.pending ? '3 5' : s.dash,
          opacity: data?.dim && !lit ? 0.18 : lit ? 1 : 0.6,
        }}
      />
      {lit && data && (
        <EdgeLabelRenderer>
          <span
            className="nodrag nopan pointer-events-none absolute rounded-[6px] border border-border bg-background px-1.5 py-0.5 text-[11px] whitespace-nowrap text-foreground"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
          >
            {data.role}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

const nodeTypes = { studio: StudioNodeView, lane: LaneNodeView };
const edgeTypes = { role: RoleEdgeView };

export interface FlowCanvasProps {
  projectId: string;
  focus: { id: string; n: number } | null;
  fitSignal: number;
  onAttach: (id: string) => void;
}

function ToolButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function Canvas({ projectId, focus, fitSignal, onAttach }: FlowCanvasProps) {
  const nodes = useCanvasNodes();
  const edges = useCanvasEdges();
  const selected = useStudio((s) => s.selected);
  const { move, setLinks, setSelected } = useStudio.getState();
  const canUndo = useStore(useStudio.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useStudio.temporal, (s) => s.futureStates.length > 0);
  const flow = useReactFlow();
  const [dropping, setDropping] = useState(0);
  const [over, setOver] = useState(false);
  const dragStart = useRef<{ id: string; x: number; y: number } | null>(null);
  const overChat = (x: number, y: number) => document.elementsFromPoint(x, y).some((el) => el.closest('[data-chat-drop]'));

  /** Files dropped on the canvas go into the workspace's inputs/ and appear where they land. */
  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const files = [...e.dataTransfer.files].filter((f) => /^(image|video|audio)\//.test(f.type));
      if (!files.length) return;
      const at = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setDropping((n) => n + files.length);
      for (const [i, f] of files.entries()) {
        try {
          const rel = await uploadToProject(projectId, f);
          const { w, h } = NODE_SIZE.upload;
          move(new Map([[rel, { x: at.x - w / 2 + i * 28, y: at.y - h / 2 + i * 28 }]]));
        } finally {
          setDropping((n) => n - 1);
        }
      }
    },
    [flow, projectId, move]
  );
  const zoom = useFlowStore((s) => s.transform[2]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const visible = useMemo(() => edges.filter((e) => byId.has(e.from) && byId.has(e.to)), [edges, byId]);
  const focusId = selected.length === 1 ? selected[0] : null;
  const related = useMemo(() => {
    const s = new Set<string>();
    if (focusId) for (const e of visible) e.from === focusId ? s.add(e.to) : e.to === focusId && s.add(e.from);
    return s;
  }, [focusId, visible]);

  const rfNodes = useMemo<Array<StudioRFNode | LaneRFNode>>(() => {
    const lanes: LaneRFNode[] = laneBoxes(nodes).map((b) => ({
      id: `lane:${b.lane}`,
      type: 'lane',
      position: { x: b.x - 16, y: b.y - 48 },
      width: b.w + 32,
      height: b.h + 64,
      data: { lane: b.lane, count: nodes.filter((n) => n.lane === b.lane).length },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
      style: { pointerEvents: 'none' },
    }));
    const sel = new Set(selected);
    const items: StudioRFNode[] = nodes.map((n) => ({
      id: n.id,
      type: 'studio',
      position: { x: n.x, y: n.y },
      width: NODE_SIZE[n.kind].w,
      height: NODE_SIZE[n.kind].h,
      data: { node: n, related: related.has(n.id) },
      selected: sel.has(n.id),
      draggable: true,
      deletable: false,
    }));
    return [...lanes, ...items];
  }, [nodes, selected, related]);

  const rfEdges = useMemo<RoleRFEdge[]>(
    () =>
      visible.map((e) => {
        const to = byId.get(e.to)!;
        const lit = !!focusId && (e.from === focusId || e.to === focusId);
        return {
          id: `${e.from}->${e.to}`,
          source: e.from,
          target: e.to,
          type: 'role',
          // Only the person's own links can be deleted; the agent's come from its files.
          deletable: !!e.user,
          data: { role: e.role, pending: to.status === 'pending' || to.status === 'running', lit, dim: !!focusId && !lit },
        };
      }),
    [visible, byId, focusId]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const moves = new Map<string, { x: number; y: number }>();
      let sel: Set<string> | null = null;
      for (const c of changes) {
        if ('id' in c && c.id.startsWith('lane:')) continue;
        if (c.type === 'position' && c.position) moves.set(c.id, c.position);
        else if (c.type === 'select') {
          sel ??= new Set(useStudio.getState().selected);
          c.selected ? sel.add(c.id) : sel.delete(c.id);
        }
      }
      if (moves.size) move(moves);
      if (sel) setSelected([...sel]);
    },
    [move, setSelected]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = new Set(changes.filter((c) => c.type === 'remove').map((c) => c.id));
      if (removed.size) setLinks((ls) => ls.filter((e) => !removed.has(`${e.from}->${e.to}`)));
    },
    [setLinks]
  );

  /** A link the person draws is saved to .studio/links.json, where the agent can read it. */
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      setLinks((ls) => (ls.some((e) => e.from === c.source && e.to === c.target) ? ls : [...ls, { from: c.source!, to: c.target!, role: 'input', user: true }]));
    },
    [setLinks]
  );

  const fit = useCallback(() => flow.fitView({ padding: 0.12, duration: 300, maxZoom: 1 }), [flow]);
  useEffect(() => {
    const t = window.setTimeout(fit, 60);
    return () => window.clearTimeout(t);
  }, [fitSignal, fit]);

  useEffect(() => {
    if (!focus) return;
    const n = byId.get(focus.id);
    if (!n) return;
    const { w, h } = NODE_SIZE[n.kind];
    flow.setCenter(n.x + w / 2 + 180, n.y + h / 2, { zoom: Math.max(flow.getZoom(), 0.8), duration: 350 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z or Ctrl+Y redo (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/input|textarea/i.test((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? history().redo() : history().undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        history().redo();
      } else if (e.key === 'Escape') setSelected([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelected]);

  const legend = [...new Map(visible.map((e) => EDGE_STYLE[e.role] ?? DEFAULT_EDGE).map((s) => [s.legend, s])).values()];
  const inspected = focusId ? byId.get(focusId) : undefined;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, n) => !n.id.startsWith('lane:') && onAttach(n.id)}
        onNodeDragStart={(_, n) => {
          dragStart.current = { id: n.id, x: n.position.x, y: n.position.y };
        }}
        onNodeDragStop={(e, n) => {
          // Dropping a node on the chat attaches it to the next message and puts it back where it was.
          const s = dragStart.current;
          dragStart.current = null;
          const p = 'clientX' in e ? e : null;
          if (s && s.id === n.id && p && overChat(p.clientX, p.clientY)) {
            move(new Map([[n.id, { x: s.x, y: s.y }]]));
            onAttach(n.id);
          }
        }}
        onPaneClick={() => setSelected([])}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!over) setOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setOver(false);
        }}
        onDrop={onDrop}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Shift']}
        selectionOnDrag={false}
        panOnScroll
        zoomOnScroll={false}
        zoomActivationKeyCode={['Meta', 'Control']}
        minZoom={0.1}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
        className="studio-flow"
      >
        <Background gap={22} size={1} color="#d9d9d5" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          nodeColor={(n) => (n.type === 'lane' ? '#f1f1ee' : (n.data as any)?.node?.status === 'done' ? '#9a9a96' : '#d1d5db')}
          nodeBorderRadius={6}
          maskColor="rgba(246,246,244,0.7)"
          className="!rounded-[10px] !border !border-border"
          style={{ width: 180, height: 110, marginRight: inspected ? 376 : undefined }}
        />
        <Panel position="top-left" className="!m-3 flex items-center gap-0.5 rounded-[10px] border border-border bg-background p-0.5">
          <ToolButton label="Undo (⌘Z)" onClick={() => history().undo()} disabled={!canUndo}>
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton label="Redo (⇧⌘Z)" onClick={() => history().redo()} disabled={!canRedo}>
            <Redo2 className="size-4" />
          </ToolButton>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <ToolButton label="Zoom out" onClick={() => flow.zoomOut({ duration: 200 })}>
            <Minus className="size-4" />
          </ToolButton>
          <span className="w-11 text-center text-[12px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <ToolButton label="Zoom in" onClick={() => flow.zoomIn({ duration: 200 })}>
            <Plus className="size-4" />
          </ToolButton>
          <ToolButton label="Fit to screen" onClick={fit}>
            <Maximize className="size-4" />
          </ToolButton>
          <ToolButton
            label="Tidy up"
            onClick={() => {
              useStudio.getState().tidy();
              window.setTimeout(fit, 30);
            }}
          >
            <LayoutGrid className="size-4" />
          </ToolButton>
        </Panel>
        {legend.length > 0 && (
          <Panel position="bottom-left" className="!m-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[10px] border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
            {legend.map((s) => (
              <span key={s.legend} className="inline-flex items-center gap-2">
                <svg width="26" height="6" aria-hidden="true">
                  <line x1="0" y1="3" x2="26" y2="3" stroke={s.stroke} strokeWidth={2} strokeDasharray={s.dash} />
                </svg>
                {s.legend}
              </span>
            ))}
          </Panel>
        )}
      </ReactFlow>
      {(over || dropping > 0) && (
        <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-[16px] border-2 border-dashed border-[var(--accent)] bg-[#0866ff]/5">
          <span className="rounded-[10px] bg-background px-3 py-2 text-[14px] font-medium">
            {dropping > 0 ? `Uploading ${dropping}…` : 'Drop to add to the canvas'}
          </span>
        </div>
      )}
      {inspected && (
        <Inspector
          node={inspected}
          nodes={nodes}
          edges={visible}
          onClose={() => setSelected([])}
          onSelect={(id) => setSelected([id])}
          onAttach={onAttach}
        />
      )}
    </div>
  );
}

/** The production canvas (React Flow): pan, zoom, select, box-select, connect, delete, undo/redo, minimap. */
export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
