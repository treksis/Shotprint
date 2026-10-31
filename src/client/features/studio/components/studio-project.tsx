import { Loader2, PanelRightClose, PanelRightOpen, Workflow } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getProject, listTemplates, loadDemo, updateProject } from '../api';
import { demoGraph, finishedText, newId, relayout } from '../lib';
import type { RunStep, StudioMessage, StudioProject, StudioState, StudioTemplate } from '../types';
import { FlowCanvas } from './canvas/flow-canvas';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';

type AgentMsg = Extract<StudioMessage, { role: 'agent' }>;

const STEP_MS = 1500;

export interface StudioProjectPageProps {
  projectId: string;
  isLive: boolean;
  onRequestLive: (reason?: string) => void;
  onProjectsChanged: () => void;
  onMissing: () => void;
}

/**
 * /studio/:id: the chat with the director, and the production canvas as an artifact panel beside it.
 * Demo mode replays the template's real run node by node; Live tools arrive in Phase 2.
 */
export function StudioProjectPage({ projectId, isLive, onRequestLive, onProjectsChanged, onMissing }: StudioProjectPageProps) {
  const [project, setProject] = useState<StudioProject | null>(null);
  const [state, setState] = useState<StudioState | null>(null);
  const [template, setTemplate] = useState<StudioTemplate | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const timers = useRef<number[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const saveTimer = useRef<number | null>(null);
  const status = useRef<StudioProject['status']>('draft');
  const answered = useRef(false);

  // Load the project and its template.
  useEffect(() => {
    let alive = true;
    Promise.all([getProject(projectId), listTemplates()])
      .then(([p, ts]) => {
        if (!alive) return;
        let s = p.state;
        // A run that was interrupted by a reload is marked stopped, not left spinning.
        s = {
          ...s,
          nodes: s.nodes.filter((n) => n.status === 'done'),
          messages: s.messages.map((m) => (m.role === 'agent' && m.state === 'running' ? { ...m, state: 'stopped', steps: m.steps.map((x) => (x.status === 'done' ? x : { ...x, status: 'stopped' })) } : m)),
        };
        status.current = p.status === 'running' ? 'draft' : p.status;
        setProject(p);
        setState(s);
        setTemplate(ts.find((t) => t.id === p.templateId) ?? null);
        setCanvasOpen(s.nodes.length > 0);
        setFitSignal((n) => n + 1);
      })
      .catch(() => alive && onMissing());
    return () => {
      alive = false;
      timers.current.forEach(window.clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Persist (debounced) whenever the canvas or chat changes.
  const persist = useCallback(
    (next: StudioState, extra?: { status?: StudioProject['status']; thumbnail?: string | null }) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        updateProject(projectId, { state: next, status: extra?.status ?? status.current, thumbnail: extra?.thumbnail })
          .then(() => extra && onProjectsChanged())
          .catch(() => undefined);
      }, extra ? 0 : 700);
    },
    [projectId, onProjectsChanged]
  );

  const apply = useCallback(
    (fn: (s: StudioState) => StudioState, extra?: Parameters<typeof persist>[1]) => {
      setState((cur) => {
        if (!cur) return cur;
        const next = fn(cur);
        persist(next, extra);
        return next;
      });
    },
    [persist]
  );

  const patchAgent = (id: string, fn: (m: AgentMsg) => AgentMsg) =>
    apply((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id && m.role === 'agent' ? fn(m) : m)) }));

  /** Demo: replay the template's real run, lane by lane, node by node. */
  const replay = useCallback(
    async (tpl: StudioTemplate) => {
      const demo = await loadDemo(tpl.example!.demoId);
      const g = demoGraph(demo);
      const agentId = newId('m');
      status.current = 'running';
      setRunning(true);
      setCanvasOpen(true);
      apply(
        (s) => ({
          ...s,
          edges: g.edges,
          messages: [...s.messages, { id: agentId, role: 'agent', steps: demo.run.map((r) => ({ ...r, status: 'pending' as const })), state: 'running', created: [] }],
        }),
        { status: 'running' }
      );
      let t = 0;
      demo.run.forEach((step, i) => {
        const laneNodes = g.nodes.filter((n) => n.lane === step.lane);
        const at = t;
        const dur = Math.max(STEP_MS, Math.min(4200, laneNodes.length * 260));
        timers.current.push(
          window.setTimeout(() => {
            patchAgent(agentId, (m) => ({ ...m, steps: m.steps.map((s, j): RunStep => ({ ...s, status: j < i ? 'done' : j === i ? 'running' : 'pending' })) }));
            apply((s) => {
              const have = new Set(s.nodes.map((n) => n.id));
              const add = laneNodes.filter((n) => !have.has(n.id)).map((n) => ({ ...n, status: 'pending' as const }));
              return add.length ? { ...s, nodes: [...s.nodes, ...add] } : s;
            });
            if (laneNodes.length) setFitSignal((n) => n + 1);
          }, at)
        );
        laneNodes.forEach((n, k) => {
          const start = at + 200 + (k / Math.max(1, laneNodes.length)) * (dur - 500);
          timers.current.push(
            window.setTimeout(() => apply((s) => ({ ...s, nodes: s.nodes.map((x) => (x.id === n.id && x.status === 'pending' ? { ...x, status: 'running' } : x)) })), start)
          );
          timers.current.push(
            window.setTimeout(() => apply((s) => ({ ...s, nodes: s.nodes.map((x) => (x.id === n.id ? { ...x, status: 'done' } : x)) })), start + 450)
          );
        });
        t += dur;
      });
      timers.current.push(
        window.setTimeout(() => {
          status.current = 'done';
          const final = g.nodes.find((n) => n.kind === 'final');
          setRunning(false);
          apply(
            (s) => ({
              ...s,
              nodes: s.nodes.map((n) => ({ ...n, status: 'done' })),
              messages: s.messages.map((m) =>
                m.id === agentId && m.role === 'agent'
                  ? { ...m, state: 'done', steps: m.steps.map((x) => ({ ...x, status: 'done' })), created: ['final', 'cut', 'fill'], text: finishedText(g.nodes) }
                  : m
              ),
            }),
            { status: 'done', thumbnail: final?.media?.poster ?? null }
          );
          if (final) {
            setSelectedId(final.id);
            setFocus({ id: final.id, n: Date.now() });
          }
        }, t + 300)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apply]
  );

  /** The director's answer to the latest brief. */
  const respond = useCallback(
    (s: StudioState, tpl: StudioTemplate | null) => {
      const finished = s.nodes.some((n) => n.kind === 'final');
      const say = (text: string, blocked = true) =>
        apply((cur) => ({ ...cur, messages: [...cur.messages, { id: newId('m'), role: 'agent', steps: [], state: blocked ? 'blocked' : 'done', created: [], text }] }));
      if (tpl?.status === 'ready' && tpl.example && !finished) return void replay(tpl);
      if (finished)
        return say(
          isLive
            ? 'Editing a finished film with live tools (retake a shot, swap a plate) is the next step being wired up. Until then, open any node to see how it was made.'
            : 'This is a replay of a real run, so it can\'t be edited here. In Live mode the director retakes shots and swaps plates on request.',
          !isLive
        );
      if (tpl)
        return say(
          isLive
            ? `"${tpl.title}" hasn't been dissected yet. Live dissection (cuts, camera moves, lines) is being wired up next; BlueChip is the template that is ready today.`
            : `"${tpl.title}" hasn't been dissected yet. Dissection measures every cut, camera move and line, and it runs Muse and the GPU, so it needs Live mode. The BlueChip template is ready to try in the demo.`
        );
      say('I build ads by filling a dissected template, so pick one from the gallery on the Studio page, or attach a reference ad to dissect in Live mode.');
    },
    [apply, replay, isLive]
  );

  // A new project arrives with the brief and no answer yet: answer it.
  useEffect(() => {
    if (!state || running || answered.current) return;
    const last = state.messages.at(-1);
    if (last?.role === 'user') {
      answered.current = true;
      respond(state, template);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const send = () => {
    const text = draft.trim();
    if (!text || !state) return;
    setDraft('');
    const next: StudioState = { ...state, messages: [...state.messages, { id: newId('m'), role: 'user', text, attachments: [] }] };
    setState(next);
    persist(next);
    window.setTimeout(() => respond(next, template), 500);
  };

  const stop = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setRunning(false);
    status.current = 'draft';
    apply(
      (s) => ({
        ...s,
        nodes: s.nodes.filter((n) => n.status === 'done'),
        messages: s.messages.map((m) => (m.role === 'agent' && m.state === 'running' ? { ...m, state: 'stopped', steps: m.steps.map((x) => (x.status === 'done' ? x : { ...x, status: 'stopped' })) } : m)),
      }),
      { status: 'draft' }
    );
  };

  if (!state || !project) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nodes = state.nodes;
  const showCanvas = canvasOpen && nodes.length > 0;
  const doneCount = nodes.filter((n) => n.status === 'done').length;
  const score = nodes.find((n) => n.kind === 'final')?.meta?.score as number | undefined;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <section
        data-chat-drop
        aria-label="Chat with the director"
        className={cn('flex min-h-0 flex-col transition-[width] duration-300', showCanvas ? 'w-[440px] shrink-0 border-r border-border max-lg:hidden' : 'flex-1')}
      >
        <ChatThread
          messages={state.messages}
          nodes={nodes}
          canvasOpen={showCanvas}
          isLive={isLive}
          onOpenCanvas={() => {
            setCanvasOpen(true);
            setFitSignal((n) => n + 1);
          }}
          onChip={(id) => {
            setCanvasOpen(true);
            setSelectedId(id);
            setFocus({ id, n: Date.now() });
          }}
          onGoLive={() => onRequestLive()}
        />
        <div className={cn('mx-auto w-full px-4 pb-4', showCanvas ? 'max-w-none' : 'max-w-[760px]')}>
          <Composer value={draft} onChange={setDraft} onSubmit={send} onStop={stop} running={running} placeholder="Reply to the director" />
        </div>
      </section>

      {showCanvas ? (
        <section aria-label="Production canvas" className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--chrome)]">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
            <Workflow className="size-4 text-muted-foreground" />
            <h2 className="truncate text-[14px] font-medium">{project.name}</h2>
            {running ? (
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {doneCount} of {nodes.length} ready
              </span>
            ) : score !== undefined ? (
              <span className="rounded-[6px] bg-[var(--pill-positive-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--pill-positive-ink)]">
                Finished · {score.toFixed(2)} / 10
              </span>
            ) : (
              <span className="text-[12px] text-muted-foreground">{nodes.length} nodes</span>
            )}
            <button
              type="button"
              aria-label="Close canvas"
              onClick={() => setCanvasOpen(false)}
              className="ml-auto grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted"
            >
              <PanelRightClose className="size-4" />
            </button>
          </header>
          <FlowCanvas
            nodes={nodes}
            edges={state.edges}
            selectedId={selectedId}
            focus={focus}
            fitSignal={fitSignal}
            onSelect={setSelectedId}
            onMove={(id, x, y) => apply((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }))}
            onTidy={() => {
              apply((s) => ({ ...s, nodes: relayout(s.nodes) }));
              setFitSignal((n) => n + 1);
            }}
            onAttach={(id) => {
              const n = nodes.find((x) => x.id === id);
              if (n) setDraft((d) => `${d}${d ? ' ' : ''}[${n.label}] `);
            }}
          />
        </section>
      ) : (
        nodes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCanvasOpen(true);
              setFitSignal((n) => n + 1);
            }}
            className="absolute top-16 right-6 inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-[13px] hover:bg-muted"
          >
            <PanelRightOpen className="size-4" />
            Canvas · {nodes.length} nodes
          </button>
        )
      )}
    </div>
  );
}
