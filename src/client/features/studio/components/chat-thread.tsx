import { AlertCircle, Bot, Check, ChevronRight, Clapperboard, FileText, Loader2, Pencil, Search, SquareTerminal, X } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { cn } from '@/lib/utils';
import { useSession } from '../session';
import type { SessionItem, StudioNode } from '../types';

export interface ChatThreadProps {
  nodes: StudioNode[];
  suggestions: string[];
  onSuggestion: (s: string) => void;
  onFocusNode: (id: string) => void;
  /** 'cli' draws the thread like a terminal session (docked chat). */
  variant?: 'chat' | 'cli';
}

const ws = (p?: string) => (p ? p.replace(/^\/run\/host_virtiofs/, '').replace(/^.*\/\.data\/workspaces\/[^/]+\//, '') : '');

/** Muse links files by their sandbox path; in the chat they read as workspace paths (the canvas has the file). */
const tidyLinks = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\((?:file:\/\/)?(\/[^)\s]*\/\.data\/workspaces\/[^/]+\/|\.\/)?([^)\s:]+)\)/g, (m, label, abs, rel) => (abs || !/^[a-z]+:/i.test(rel) ? `**${label}** (\`${rel}\`)` : m))
    .replace(/(?:\/run\/host_virtiofs)?\/[^\s`)]*\/\.data\/workspaces\/[^/\s]+\//g, '');

/** How a tool call reads in the transcript: a verb, its target, and the shell command if there is one. */
function describe(it: SessionItem): { icon: typeof SquareTerminal; title: string; detail?: string } {
  const a = it.args ?? {};
  const tool = (it.tool ?? '').toLowerCase();
  const cmd = it.commandText ?? (typeof a.command === 'string' ? a.command : undefined);
  if (tool === 'bash_input') return { icon: SquareTerminal, title: 'Send input to a running command', detail: typeof a.input === 'string' ? a.input : undefined };
  if (cmd || /bash|shell|exec/.test(tool)) return { icon: SquareTerminal, title: a.description || 'Run', detail: cmd };
  if (/write|create/.test(tool)) return { icon: Pencil, title: `Write ${ws(a.path ?? a.file_path)}` };
  if (/edit|patch|replace/.test(tool)) return { icon: Pencil, title: `Edit ${ws(a.path ?? a.file_path)}` };
  if (/read|view|open/.test(tool)) return { icon: FileText, title: `Read ${ws(a.path ?? a.file_path)}` };
  if (/grep|glob|search|find|list/.test(tool)) return { icon: Search, title: `${it.tool} ${a.pattern ?? a.path ?? ''}`.trim() };
  return { icon: SquareTerminal, title: it.tool ?? 'Tool', detail: Object.keys(a).length ? JSON.stringify(a) : undefined };
}

/** Workspace files a tool call touched that are on the canvas: shown as chips that jump to the node. */
function touched(it: SessionItem, byId: Map<string, StudioNode>): StudioNode[] {
  const hay = `${it.commandText ?? ''} ${it.args?.command ?? ''} ${ws(it.args?.path ?? it.args?.file_path)} ${it.status === 'completed' ? (it.output ?? '').slice(-600) : ''}`;
  const out: StudioNode[] = [];
  for (const [id, n] of byId) if (hay.includes(id) && out.length < 6) out.push(n);
  return out;
}

function NodeChip({ node, onClick }: { node: StudioNode; onClick: () => void }) {
  const thumb = node.media?.poster ?? (node.media?.type === 'image' ? node.media.src : undefined);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 max-w-[220px] cursor-pointer items-center gap-1.5 rounded-full bg-[rgba(0,0,0,0.05)] pr-2.5 pl-0.5 text-[12px] hover:bg-[rgba(0,0,0,0.08)]"
    >
      {thumb ? <img src={thumb} alt="" className="size-6 rounded-full object-cover" /> : <span className="grid size-6 place-items-center rounded-full bg-background"><FileText className="size-3" /></span>}
      <span className="truncate font-medium">{node.id}</span>
    </button>
  );
}

const ToolRow = memo(function ToolRow({ it, chips, onFocusNode, cli = false }: { it: SessionItem; chips: StudioNode[]; onFocusNode: (id: string) => void; cli?: boolean }) {
  const [open, setOpen] = useState(false);
  const d = describe(it);
  const Icon = d.icon;
  const running = it.status === 'inProgress';
  const failed = it.status === 'failed' || (typeof it.exitCode === 'number' && it.exitCode !== 0);
  const hasBody = !!(it.output?.trim() || d.detail);
  if (cli) {
    const out = it.output?.trim() ?? '';
    const lines = out ? out.split('\n') : [];
    const summary = failed ? lines.find((l) => /error|fail|traceback/i.test(l)) ?? lines[lines.length - 1] : lines.length ? (lines.length > 1 ? `${lines[0].slice(0, 120)} … +${lines.length - 1} lines` : lines[0].slice(0, 140)) : '';
    return (
      <div className="leading-relaxed">
        <button type="button" onClick={() => hasBody && setOpen((o) => !o)} className={cn('flex w-full items-baseline gap-2 text-left', hasBody && 'cursor-pointer')}>
          <span className={cn('shrink-0', running ? 'animate-pulse text-[var(--accent)]' : failed ? 'text-[var(--negative)]' : 'text-[var(--cli-ok)]')}>⏺</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-bold text-foreground">{d.title}</span>
            {d.detail && <span className="text-muted-foreground">({d.detail.split('\n')[0].slice(0, 120)})</span>}
          </span>
          {typeof it.durationMs === 'number' && !running && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{(it.durationMs / 1000).toFixed(1)}s</span>}
        </button>
        {running && <p className="pl-4 text-muted-foreground">⎿&nbsp; Running…</p>}
        {!running && summary && !open && <p className={cn('truncate pl-4', failed ? 'text-[var(--negative)]' : 'text-muted-foreground')}>⎿&nbsp; {summary}</p>}
        {open && (
          <pre className="max-h-72 overflow-auto pl-4 text-[12px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {d.detail ? `$ ${d.detail}\n` : ''}
            {out}
          </pre>
        )}
        {chips.length > 0 && (
          <p className="pl-4 text-muted-foreground">
            ⎿&nbsp; wrote{' '}
            {chips.map((n, i) => (
              <span key={n.id}>
                {i > 0 && ', '}
                <button type="button" onClick={() => onFocusNode(n.id)} className="cursor-pointer text-[var(--accent)] underline-offset-2 hover:underline">
                  {n.id}
                </button>
              </span>
            ))}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="group">
      <button
        type="button"
        onClick={() => hasBody && setOpen((o) => !o)}
        className={cn('flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[13px]', hasBody && 'cursor-pointer hover:bg-[rgba(0,0,0,0.04)]')}
      >
        <span className="grid size-4 shrink-0 place-items-center">
          {running ? <Loader2 className="size-3.5 animate-spin text-[var(--accent)]" /> : failed ? <X className="size-3.5 text-[var(--negative)]" /> : <Icon className="size-3.5 text-muted-foreground" />}
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium text-foreground">{running ? <Shimmer>{d.title}</Shimmer> : d.title}</span>
          {d.detail && <span className="ml-2 font-mono text-[12px] text-muted-foreground">{d.detail.split('\n')[0].slice(0, 140)}</span>}
        </span>
        {typeof it.durationMs === 'number' && !running && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{(it.durationMs / 1000).toFixed(1)}s</span>}
        {hasBody && <ChevronRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />}
      </button>
      {open && (
        <div className="mt-1 mb-2 ml-8 overflow-hidden rounded-[10px] border border-border bg-[var(--chrome)]">
          {d.detail && <pre className="max-h-40 overflow-auto border-b border-border px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">{d.detail}</pre>}
          {it.output?.trim() && <pre className="max-h-64 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{it.output.trim()}</pre>}
        </div>
      )}
      {chips.length > 0 && (
        <div className="mt-1 mb-1.5 ml-8 flex flex-wrap gap-1.5">
          {chips.map((n) => (
            <NodeChip key={n.id} node={n} onClick={() => onFocusNode(n.id)} />
          ))}
        </div>
      )}
    </div>
  );
});

/** A workflow Muse launched, or one of its subagents: what it was asked to do and whether it is done. */
function AgentCard({ it }: { it: SessionItem }) {
  const [open, setOpen] = useState(false);
  const running = it.status === 'inProgress';
  const sub = it.kind === 'subagent';
  const title = sub ? `Subagent${it.args?.path ? ` · ${it.args.path}` : ''}` : `Workflow · ${it.text}`;
  const body = sub ? it.text ?? '' : '';
  const kids = !sub && typeof it.args?.children === 'number' ? `${it.args.children} subagent${it.args.children === 1 ? '' : 's'}` : '';
  return (
    <div className="my-1 rounded-[12px] border border-border bg-background">
      <button type="button" onClick={() => body && setOpen((o) => !o)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-[13px]', body && 'cursor-pointer')}>
        {running ? <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--accent)]" /> : it.status === 'failed' ? <X className="size-3.5 shrink-0 text-[var(--negative)]" /> : <Check className="size-3.5 shrink-0 text-[var(--positive)]" />}
        <Bot className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        {kids && <span className="shrink-0 text-[12px] text-muted-foreground">{kids}</span>}
        {body && <ChevronRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />}
      </button>
      {body && <p className={cn('px-3 pb-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap text-muted-foreground', !open && 'line-clamp-2')}>{body}</p>}
    </div>
  );
}

/** Sending a message always brings the conversation back to the bottom, even if you had scrolled up. */
function FollowOnSend({ lastUserId }: { lastUserId?: string }) {
  const { scrollToBottom } = useStickToBottomContext();
  useEffect(() => {
    if (lastUserId) void scrollToBottom();
  }, [lastUserId, scrollToBottom]);
  return null;
}

/** Muse Code's transcript (AI Elements): your messages, its thinking, replies and every command it runs. */
export function ChatThread({ nodes, suggestions, onSuggestion, onFocusNode, variant = 'chat' }: ChatThreadProps) {
  const cli = variant === 'cli';
  const order = useSession((s) => s.order);
  const items = useSession((s) => s.byId);
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const model = useSession((s) => s.model);
  const byId = useMemo(() => new Map(nodes.filter((n) => n.status === 'done').map((n) => [n.id, n])), [nodes]);

  // Consecutive agent items form one block under one avatar, like a terminal session.
  const blocks = useMemo(() => {
    const out: Array<{ user?: SessionItem; agent?: SessionItem[] }> = [];
    for (const id of order) {
      const it = items[id];
      if (!it) continue;
      if (it.kind === 'userMessage') out.push({ user: it });
      else if (out.at(-1)?.agent) out.at(-1)!.agent!.push(it);
      else out.push({ agent: [it] });
    }
    return out;
  }, [order, items]);

  const running = status === 'running';
  const last = order.length ? items[order[order.length - 1]] : undefined;
  const busyTail = running && (!last || last.kind === 'userMessage' || last.status !== 'inProgress');

  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent className={cn('mx-auto w-full', cli ? 'max-w-none gap-2.5 px-4 pt-3 pb-3 text-[13px]' : 'max-w-[720px] gap-6 px-5 pt-6 pb-10')}>
        {blocks.map((b, i) =>
          b.user && cli ? (
            <div key={b.user.id} className="-mx-2 flex gap-2 rounded-[4px] bg-[#161b22] px-2 py-1 leading-relaxed">
              <span className="shrink-0 font-bold text-[var(--cli-prompt)]">❯</span>
              <span className="min-w-0 whitespace-pre-wrap text-foreground">
                {b.user.text?.replace(/\n\n\(Template picked:[^)]*\)\s*$/, '').replace(/\n\n\(Reference film:[^)]*\)\s*$/, '')}
                {b.user.steered && <span className="ml-2 text-muted-foreground">(steer)</span>}
              </span>
            </div>
          ) : b.user ? (
            <Message key={b.user.id} from="user">
              {b.user.steered && <p className="ml-auto text-[12px] font-medium text-[var(--accent)]">Steered · sent while Muse was working</p>}
              <MessageContent className={cn('rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap', b.user.steered ? 'bg-[rgba(8,102,255,0.08)]' : 'bg-[rgba(0,0,0,0.05)]')}>
                {b.user.text?.replace(/\n\n\(Template picked:[^)]*\)\s*$/, '').replace(/\n\n\(Reference film:[^)]*\)\s*$/, '')}
              </MessageContent>
            </Message>
          ) : (
            <div key={`a${i}`} className={cn('flex', cli ? 'gap-0' : 'gap-3')}>
              {!cli && (
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#0866ff] text-[#ffffff]">
                  <Clapperboard className="size-3.5" />
                </span>
              )}
              <div className={cn('min-w-0 flex-1', cli ? 'space-y-0.5' : 'space-y-1.5')}>
                {!cli && <p className="text-[13px] font-medium text-muted-foreground">Muse Code</p>}
                {b.agent!.map((it) => {
                  if (it.kind === 'reasoning') {
                    const text = (it.summary ?? []).filter(Boolean).join('\n\n') || it.text || '';
                    if (!text && it.status !== 'inProgress') return null;
                    return (
                      <Reasoning key={it.id} isStreaming={it.status === 'inProgress'} defaultOpen={false} className="mb-0">
                        <ReasoningTrigger className="text-[13px]" />
                        <ReasoningContent className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{text || '…'}</ReasoningContent>
                      </Reasoning>
                    );
                  }
                  if (it.kind === 'agentMessage' && cli)
                    return it.text ? (
                      <div key={it.id} className="flex gap-2 py-1">
                        <span className="shrink-0 text-foreground">⏺</span>
                        <MessageResponse className="min-w-0 flex-1 text-[13px] leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">{tidyLinks(it.text)}</MessageResponse>
                      </div>
                    ) : null;
                  if (it.kind === 'agentMessage')
                    return it.text ? (
                      <MessageResponse key={it.id} className="py-0.5 text-[15px] leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
                        {tidyLinks(it.text)}
                      </MessageResponse>
                    ) : null;
                  if (it.kind === 'toolCall' || it.kind === 'userShell') return <ToolRow key={it.id} it={it} chips={it.status === 'completed' ? touched(it, byId) : []} onFocusNode={onFocusNode} cli={cli} />;
                  if (it.kind === 'notice') return <p key={it.id} className="px-2 text-[13px] text-muted-foreground">{it.text}</p>;
                  if (it.kind === 'error')
                    return (
                      <p key={it.id} className="flex items-start gap-2 text-[14px] text-[var(--negative)]">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {it.text}
                      </p>
                    );
                  if (it.kind === 'subagent' || it.kind === 'workflow') return <AgentCard key={it.id} it={it} />;
                  return null;
                })}
              </div>
            </div>
          )
        )}

        {(busyTail || status === 'starting') && (
          <div className="flex items-center gap-3">
            {cli ? (
              <span className="text-[var(--cli-prompt)]">✻</span>
            ) : (
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0866ff] text-[#ffffff]">
                <Clapperboard className="size-3.5" />
              </span>
            )}
            <Shimmer className={cli ? 'text-[13px]' : 'text-[14px]'}>{status === 'starting' ? 'Starting the sandbox…' : `Working · ${model === 'wonder' ? 'Muse Wonder' : 'Muse Spark'}`}</Shimmer>
          </div>
        )}
        {status === 'error' && error && (
          <p className="flex items-start gap-2 rounded-[14px] bg-[rgba(228,30,63,0.06)] px-4 py-3 text-[14px] text-[var(--negative)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {!running && suggestions.length > 0 && cli && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>Try:</span>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => onSuggestion(s)} className="cursor-pointer text-[var(--accent)] underline-offset-2 hover:underline">
                "{s}"
              </button>
            ))}
          </p>
        )}
        {!running && suggestions.length > 0 && !cli && (
          <Suggestions>
            {suggestions.map((s) => (
              <Suggestion key={s} suggestion={s} onClick={onSuggestion} className={cn('text-[13px]', cli ? 'rounded-[6px] border-border font-mono' : 'rounded-full')} />
            ))}
          </Suggestions>
        )}
      </ConversationContent>
      <FollowOnSend lastUserId={[...order].reverse().find((id) => items[id]?.kind === 'userMessage')} />
      <ConversationScrollButton />
    </Conversation>
  );
}
