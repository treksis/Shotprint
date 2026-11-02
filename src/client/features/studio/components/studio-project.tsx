import { ChevronDown, ChevronUp, CircleDot, ListTodo, Loader2, Maximize2, Minimize2, PanelBottom, PanelLeft, PanelRightClose, PanelRightOpen, SquareTerminal, Workflow, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Queue, QueueItem, QueueItemAction, QueueItemActions, QueueItemContent, QueueItemIndicator, QueueList } from '@/components/ai-elements/queue';
import { getProject, interruptTurn, openEvents, saveLinks, sendTurn, setSessionModel, startProject, unqueueTurn, updateProject, uploadToProject, type DirectorModel } from '../api';
import { useSession } from '../session';
import { history, useCanvasNodes, useStudio } from '../store';
import type { StudioProject } from '../types';
import { FlowCanvas } from './canvas/flow-canvas';
import { ChatThread } from './chat-thread';
import { Composer } from './composer';

export interface StudioProjectPageProps {
  projectId: string;
  isLive: boolean;
  onRequestLive: (reason?: string) => void;
  onProjectsChanged: () => void;
  onMissing: () => void;
}

/**
 * /studio/:id: a Muse Code session in its own sandbox. The chat is the session's live turn stream
 * (steer, queue and stop are Muse Code's own); the canvas is a live view of the sandbox's workspace.
 */
export function StudioProjectPage({ projectId, isLive, onRequestLive, onProjectsChanged, onMissing }: StudioProjectPageProps) {
  const [project, setProject] = useState<StudioProject | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(true);
  const [layout, setLayout] = useState<'dock' | 'side'>(() => (readPref('museclone.studio.layout') === 'side' ? 'side' : 'dock'));
  const [dockHeight, setDockHeight] = useState(() => Number(readPref('museclone.studio.dock')) || Math.max(320, Math.round(window.innerHeight * 0.45)));
  const [dockState, setDockState] = useState<'open' | 'min' | 'max'>('open');
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const status = useSession((s) => s.status);
  const runnable = useSession((s) => s.runnable);
  const connected = useSession((s) => s.connected);
  const model = useSession((s) => s.model);
  const queued = useSession((s) => s.queued);
  const todos = useSession((s) => s.todos);
  const usd = useSession((s) => s.usd);
  const itemCount = useSession((s) => s.order.length);
  const graph = useSession((s) => s.graph);
  const nodes = useCanvasNodes();
  const started = useRef(false);
  const loaded = useRef(false);
  const seen = useRef(0);

  // Load the project (canvas layout), then follow its session.
  useEffect(() => {
    let alive = true;
    loaded.current = false;
    started.current = false;
    seen.current = 0;
    useSession.getState().reset();
    getProject(projectId)
      .then((p) => {
        if (!alive) return;
        useStudio.getState().load(p.state?.positions ?? {});
        history().clear();
        setProject(p);
        loaded.current = true;
      })
      .catch((err: Error) => {
        if (!alive) return;
        if (/not_found|404/.test(err.message)) onMissing();
        else window.setTimeout(() => alive && setRetry((n) => n + 1), 1500);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, retry]);

  useEffect(() => {
    if (!project) return;
    const { apply, setConnected } = useSession.getState();
    return openEvents(
      project.id,
      (e) => {
        setConnected(true);
        apply(e);
      },
      () => setConnected(false)
    );
  }, [project]);

  // Workspace changes reach the canvas; new files fit into view as they appear.
  useEffect(() => {
    useStudio.getState().setGraph(graph);
    const done = graph.nodes.length;
    if (done !== seen.current) {
      if (seen.current === 0 || done > seen.current) setFitSignal((n) => n + 1);
      seen.current = done;
    }
  }, [graph]);

  // A new project's brief goes out as its first turn, once (the server also guards this).
  useEffect(() => {
    if (!project || !connected || !runnable || started.current || itemCount > 0 || status === 'running') return;
    started.current = true;
    if (project.prompt.trim()) startProject(project.id).catch((e: Error) => setSendError(e.message));
  }, [project, connected, runnable, itemCount, status]);

  // Persist the canvas layout (debounced); the person's own links go to the workspace for the agent.
  useEffect(() => {
    let t: number | null = null;
    const unsub = useStudio.subscribe((s, prev) => {
      if (!loaded.current) return;
      if (s.links !== prev.links && prev.graph.nodes.length) void saveLinks(projectId, s.links).catch(() => undefined);
      if (s.positions === prev.positions) return;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => void updateProject(projectId, { state: { positions: useStudio.getState().positions } }).catch(() => undefined), 800);
    });
    return () => {
      unsub();
      if (t) window.clearTimeout(t);
    };
  }, [projectId]);

  // The sidebar shows whether a project is running.
  const lastStatus = useRef(status);
  useEffect(() => {
    if (!project || lastStatus.current === status) return;
    lastStatus.current = status;
    const final = nodes.find((n) => n.kind === 'final' && n.status === 'done');
    const next = status === 'running' ? 'running' : final ? 'done' : 'draft';
    if (next !== project.status || (final?.media?.poster && final.media.poster !== project.thumbnail)) {
      void updateProject(project.id, { status: next, thumbnail: final?.media?.poster ?? project.thumbnail })
        .then((p) => {
          setProject((cur) => (cur ? { ...cur, status: p.status, thumbnail: p.thumbnail } : cur));
          onProjectsChanged();
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const running = status === 'running';

  const send = async (text: string, files: File[], mode: 'send' | 'steer' | 'queue' = 'send') => {
    if (!project) return;
    setSendError(null);
    setDraft('');
    try {
      const paths = [];
      for (const f of files) paths.push(await uploadToProject(project.id, f));
      await sendTurn(project.id, { text, mode, model, files: paths });
    } catch (e) {
      setDraft(text);
      setSendError((e as Error).message);
    }
  };

  const changeModel = async (m: DirectorModel) => {
    if (m === 'wonder' && !isLive && !import.meta.env.DEV) return onRequestLive('Muse Wonder runs in Live mode.');
    useSession.setState({ model: m });
    await setSessionModel(projectId, m).catch((e: Error) => setSendError(e.message));
  };

  if (!project) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showCanvas = canvasOpen && nodes.length > 0;
  const working = nodes.filter((n) => n.status === 'running').length;
  const toRender = nodes.filter((n) => n.status === 'pending').length;
  const hasFinal = nodes.some((n) => n.kind === 'final' && n.status === 'done');
  const suggestions = hasFinal ? ['Make a vertical 9:16 edition', 'Tighten the cut to 20 seconds'] : itemCount === 0 && !project.prompt ? ['Plan a 30-second film about a lighthouse keeper', 'Make three keyframes for a product reveal'] : [];
  const openTodos = todos.filter((t) => t.status !== 'completed');

  const chooseLayout = (l: 'dock' | 'side') => {
    setLayout(l);
    writePref('museclone.studio.layout', l);
    setFitSignal((n) => n + 1);
  };

  // Drag the dock's top edge to resize it (Cloud Shell style); the height is remembered.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = dockHeight;
    let h = h0;
    const move = (ev: PointerEvent) => {
      h = Math.min(window.innerHeight - 160, Math.max(180, h0 + y0 - ev.clientY));
      setDockHeight(h);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      writePref('museclone.studio.dock', String(Math.round(h)));
      setFitSignal((n) => n + 1);
    };
    setDockState('open');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const docked = showCanvas && layout === 'dock';
  const thread = (
    <ChatThread
      variant={docked ? 'cli' : 'chat'}
      nodes={nodes}
      suggestions={suggestions}
      onSuggestion={setDraft}
      onFocusNode={(id) => {
        setCanvasOpen(true);
        useStudio.getState().setSelected([id]);
        setFocus({ id, n: Date.now() });
      }}
    />
  );

  const chatBottom = (
    <div className={cn('mx-auto w-full px-4 pb-4', !showCanvas && 'max-w-[760px]', docked && 'max-w-[1100px] pb-3')}>
      {todos.length > 0 && openTodos.length > 0 && (
        <div className="mb-2 rounded-[18px] border border-border bg-background px-3 py-2">
          <p className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <ListTodo className="size-3.5" />
            Plan · {todos.length - openTodos.length} of {todos.length} done
          </p>
          <ul className="space-y-0.5">
            {todos.map((t, i) => (
              <li key={i} className={cn('flex items-start gap-2 text-[13px]', t.status === 'completed' && 'text-muted-foreground line-through')}>
                <CircleDot className={cn('mt-[3px] size-3 shrink-0', t.status === 'inProgress' ? 'text-[var(--accent)]' : 'text-[var(--control)]')} />
                {t.status === 'inProgress' && t.activeForm ? t.activeForm : t.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {queued.length > 0 && (
        <Queue className="mb-2 rounded-[18px] border-border bg-background px-2 py-1.5">
          <QueueList>
            {queued.map((q) => (
              <QueueItem key={q.turnId}>
                <div className="flex items-center gap-2">
                  <QueueItemIndicator />
                  <QueueItemContent>{q.text}</QueueItemContent>
                  <QueueItemActions>
                    <QueueItemAction aria-label="Remove from queue" onClick={() => void unqueueTurn(project.id, q.turnId)}>
                      <X className="size-3" />
                    </QueueItemAction>
                  </QueueItemActions>
                </div>
              </QueueItem>
            ))}
          </QueueList>
          <p className="px-2 pb-1 text-[11px] text-muted-foreground">Queued in Muse Code · runs when the current turn ends</p>
        </Queue>
      )}
      {!runnable && connected && (
        <p className="mb-2 rounded-[14px] bg-muted px-4 py-2.5 text-[13px] text-muted-foreground">This server can't start sandboxes (Docker isn't available), so this session is read-only.</p>
      )}
      <div className={cn(docked && 'cli-input')}>
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={(t, f) => send(t, f)}
        onStop={() => void interruptTurn(project.id)}
        onSteer={(t) => void send(t, [], 'steer')}
        onQueue={(t) => void send(t, [], 'queue')}
        running={running}
        busy={status === 'starting' || !runnable}
        placeholder={running ? 'Steer Muse (Enter) or queue a message for the next turn' : 'Ask Muse: plan a film, make keyframes, render a shot, change the cut…'}
        model={model}
        onModelChange={(m) => void changeModel(m)}
        allowedModels={isLive || import.meta.env.DEV ? ['spark', 'wonder'] : ['spark']}
        footnote={sendError ? <span className="text-[var(--negative)]">{sendError}</span> : `Muse Code in a private sandbox · $${usd.toFixed(usd < 1 ? 3 : 2)} spent on this project`}
      />
      </div>
    </div>
  );

  const canvasSection = (
    <section aria-label="Workspace canvas" className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--chrome)]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <Workflow className="size-4 text-muted-foreground" />
        <h2 className="truncate text-[14px] font-medium">{project.name}</h2>
        {working > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {working} in progress
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground">
            {nodes.length - toRender} files{toRender > 0 && ` · ${toRender} planned, not rendered`}
          </span>
        )}
        <button
          type="button"
          aria-label={layout === 'dock' ? 'Chat beside the canvas' : 'Chat docked at the bottom'}
          title={layout === 'dock' ? 'Chat beside the canvas' : 'Chat docked at the bottom'}
          onClick={() => chooseLayout(layout === 'dock' ? 'side' : 'dock')}
          className="ml-auto grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted"
        >
          {layout === 'dock' ? <PanelLeft className="size-4" /> : <PanelBottom className="size-4" />}
        </button>
        <button type="button" aria-label="Close canvas" onClick={() => setCanvasOpen(false)} className="grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
          <PanelRightClose className="size-4" />
        </button>
      </header>
      <FlowCanvas
        projectId={project.id}
        focus={focus}
        fitSignal={fitSignal}
        onAttach={(id) => setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}\`${id}\` `)}
      />
    </section>
  );

  if (showCanvas && layout === 'dock') {
    const done = todos.length - openTodos.length;
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {canvasSection}
        <section
          data-chat-drop
          aria-label="Muse Code session"
          style={dockState === 'open' ? { height: dockHeight } : undefined}
          className={cn('cli-surface relative flex shrink-0 flex-col border-t border-border bg-background shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]', dockState === 'max' && 'absolute inset-x-0 top-0 bottom-0 z-20', dockState === 'min' && 'h-10')}
        >
          {dockState === 'open' && <div role="separator" aria-orientation="horizontal" aria-label="Resize chat" onPointerDown={startResize} className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize hover:bg-[var(--accent)]/30" />}
          <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-[var(--chrome)] px-3 text-[13px]">
            <SquareTerminal className="size-4 text-[var(--cli-ok)]" />
            <span className="font-medium">muse-code</span>
            <span className="truncate text-muted-foreground">~/{project.name}</span>
            {running ? (
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {openTodos.find((t) => t.status === 'inProgress')?.activeForm ?? 'Working'}
              </span>
            ) : (
              <span className={cn('size-2 rounded-full', connected ? 'bg-[var(--positive,#16a34a)]' : 'bg-[var(--control)]')} aria-label={connected ? 'Connected' : 'Disconnected'} />
            )}
            {todos.length > 0 && (
              <span className="hidden text-[12px] text-muted-foreground sm:inline">
                Plan {done}/{todos.length}
              </span>
            )}
            <span className="ml-auto hidden text-[12px] text-muted-foreground md:inline">${usd.toFixed(usd < 1 ? 3 : 2)}</span>
            <button type="button" aria-label={dockState === 'min' ? 'Show chat' : 'Minimize chat'} onClick={() => setDockState(dockState === 'min' ? 'open' : 'min')} className="grid size-7 cursor-pointer place-items-center rounded-[6px] hover:bg-muted max-md:ml-auto">
              {dockState === 'min' ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            <button type="button" aria-label={dockState === 'max' ? 'Restore chat' : 'Maximize chat'} onClick={() => setDockState(dockState === 'max' ? 'open' : 'max')} className="grid size-7 cursor-pointer place-items-center rounded-[6px] hover:bg-muted">
              {dockState === 'max' ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </header>
          {dockState !== 'min' && (
            <div className="flex min-h-0 flex-1 flex-col">
              {thread}
              {chatBottom}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <section data-chat-drop aria-label="Muse Code session" className={cn('flex min-h-0 flex-col', showCanvas ? 'w-[460px] shrink-0 border-r border-border max-lg:hidden' : 'flex-1')}>
        {thread}
        {chatBottom}
      </section>
      {showCanvas ? (
        canvasSection
      ) : (
        nodes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCanvasOpen(true);
              setFitSignal((n) => n + 1);
            }}
            className="absolute top-3 right-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-[13px] hover:bg-muted"
          >
            <PanelRightOpen className="size-4" />
            Canvas · {nodes.length} files
          </button>
        )
      )}
    </div>
  );
}

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the layout just isn't remembered */
  }
}
