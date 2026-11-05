import { CircleDot, ListTodo, Loader2, PanelRightClose, PanelRightOpen, Workflow, X } from 'lucide-react';
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

  // First open: the project's own microVM boots and replays its session before anything arrives.
  const booting = !connected && itemCount === 0 && nodes.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {booting && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-background/90 backdrop-blur-sm">
          <div className="max-w-[420px] px-6 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-[#0866ff]" />
            <p className="mt-4 text-[16px] font-medium">Starting this project’s microVM…</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Every project runs Muse Code in its own VM. It boots, restores the workspace and replays the session. The
              first open takes about 15 seconds.
            </p>
          </div>
        </div>
      )}
      <section data-chat-drop aria-label="Muse Code session" className={cn('flex min-h-0 flex-col', showCanvas ? 'w-[460px] shrink-0 border-r border-border max-lg:hidden' : 'flex-1')}>
        <ChatThread
          nodes={nodes}
          suggestions={suggestions}
          onSuggestion={setDraft}
          onFocusNode={(id) => {
            setCanvasOpen(true);
            useStudio.getState().setSelected([id]);
            setFocus({ id, n: Date.now() });
          }}
        />
        <div className={cn('mx-auto w-full px-4 pb-4', !showCanvas && 'max-w-[760px]')}>
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
            footnote={sendError ? <span className="text-[var(--negative)]">{sendError}</span> : `Muse Code in its own microVM · $${usd.toFixed(usd < 1 ? 3 : 2)} spent on this project`}
          />
        </div>
      </section>

      {showCanvas ? (
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
            <button type="button" aria-label="Close canvas" onClick={() => setCanvasOpen(false)} className="ml-auto grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
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
