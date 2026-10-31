import { Check, CircleDashed, Clapperboard, ListChecks, Loader2, PanelRightOpen, Workflow } from 'lucide-react';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Task, TaskContent, TaskItem, TaskTrigger } from '@/components/ai-elements/task';
import { cn } from '@/lib/utils';
import { useStudio } from '../store';
import { KIND_LABEL, type StudioNode } from '../types';

export interface ChatThreadProps {
  canvasOpen: boolean;
  isLive: boolean;
  suggestions: string[];
  onSuggestion: (s: string) => void;
  onOpenCanvas: () => void;
  onChip: (id: string) => void;
  onGoLive: () => void;
}

function NodeChip({ node, onClick }: { node: StudioNode; onClick: () => void }) {
  const thumb = node.media?.poster ?? (node.media?.type === 'image' ? node.media.src : undefined);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full bg-[rgba(0,0,0,0.05)] pr-3 pl-1 text-[13px] hover:bg-[rgba(0,0,0,0.08)]"
    >
      {thumb ? (
        <img src={thumb} alt="" className="size-6 rounded-full object-cover" />
      ) : (
        <span className="grid size-6 place-items-center rounded-full bg-background">
          <Workflow className="size-3" />
        </span>
      )}
      <span className="text-muted-foreground">{KIND_LABEL[node.kind]}</span>
      <span className="max-w-[140px] truncate font-medium">{node.label}</span>
    </button>
  );
}

/** The conversation (AI Elements): briefs, the director's task list, results, and the canvas card. */
export function ChatThread({ canvasOpen, isLive, suggestions, onSuggestion, onOpenCanvas, onChip, onGoLive }: ChatThreadProps) {
  const messages = useStudio((s) => s.messages);
  const nodes = useStudio((s) => s.nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const done = nodes.filter((n) => n.status === 'done').length;
  const working = nodes.some((n) => n.status === 'running' || n.status === 'pending');
  const lastAgent = [...messages].reverse().find((m) => m.role === 'agent');
  const waiting = messages.at(-1)?.role === 'user';

  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent className="mx-auto w-full max-w-[720px] gap-7 px-5 pt-6 pb-10">
        {messages.map((m) =>
          m.role === 'user' ? (
            <Message key={m.id} from="user">
              <MessageContent className="rounded-[20px] bg-[rgba(0,0,0,0.05)] px-4 py-2.5 text-[15px] leading-relaxed">
                {m.text}
              </MessageContent>
              {m.attachments.length > 0 && <p className="ml-auto text-[12px] text-muted-foreground">{m.attachments.join(', ')}</p>}
            </Message>
          ) : (
            <Message key={m.id} from="assistant" className="max-w-full">
              <div className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#0866ff] text-[#ffffff]">
                  <Clapperboard className="size-3.5" />
                </span>
                <MessageContent className="min-w-0 flex-1 gap-3 text-[15px]">
                  <p className="text-[13px] font-medium text-muted-foreground">Director</p>

                  {m.steps.length > 0 && (
                    <Task defaultOpen className="rounded-[14px] border border-border">
                      <TaskTrigger title="">
                        <button type="button" className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground">
                          <ListChecks className="size-4" />
                          <span className="flex-1 text-left">
                            {m.state === 'running'
                              ? `Working · step ${Math.min(m.steps.filter((s) => s.status === 'done').length + 1, m.steps.length)} of ${m.steps.length}`
                              : `${m.steps.filter((s) => s.status === 'done').length} of ${m.steps.length} steps done`}
                          </span>
                        </button>
                      </TaskTrigger>
                      <TaskContent>
                        <ol className="border-t border-border">
                          {m.steps.map((s, i) => (
                            <TaskItem key={i} className={cn('flex items-start gap-2.5 px-3.5 py-2.5 text-[14px]', i > 0 && 'border-t border-border')}>
                              <span className="mt-[3px] grid size-4 shrink-0 place-items-center">
                                {s.status === 'done' ? (
                                  <Check className="size-4 text-[var(--positive)]" />
                                ) : s.status === 'running' ? (
                                  <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
                                ) : (
                                  <CircleDashed className="size-3.5 text-[var(--control)]" />
                                )}
                              </span>
                              <span className={cn('min-w-0 flex-1 leading-snug', s.status === 'done' || s.status === 'running' ? 'text-foreground' : 'text-muted-foreground')}>
                                {s.status === 'running' ? <Shimmer>{s.text}</Shimmer> : s.text}
                              </span>
                              {s.cost && <span className="shrink-0 pt-px text-[12px] tabular-nums text-muted-foreground">{s.cost}</span>}
                            </TaskItem>
                          ))}
                        </ol>
                      </TaskContent>
                    </Task>
                  )}

                  {nodes.length > 0 && m === lastAgent && (m.state === 'running' || m.state === 'done') && (
                    <button
                      type="button"
                      onClick={onOpenCanvas}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-background p-2.5 text-left hover:border-[#c9c9c6]"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[var(--chrome)]">
                        {working ? <Loader2 className="size-4 animate-spin text-[var(--accent)]" /> : <Workflow className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">Production canvas</span>
                        <span className="block text-[12px] text-muted-foreground">
                          {working ? `${done} of ${nodes.length} nodes ready` : `${nodes.length} nodes · undo, connect, rearrange`}
                        </span>
                      </span>
                      {!canvasOpen && (
                        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-muted px-2.5 py-1 text-[12px] font-medium">
                          <PanelRightOpen className="size-3.5" />
                          Open
                        </span>
                      )}
                    </button>
                  )}

                  {m.text && <MessageResponse className="text-[15px] leading-relaxed">{m.text}</MessageResponse>}
                  {m.state === 'blocked' && !isLive && (
                    <div>
                      <button
                        type="button"
                        onClick={onGoLive}
                        className="inline-flex h-9 cursor-pointer items-center rounded-full bg-[var(--meta-blue)] px-4 text-[14px] font-medium text-white"
                      >
                        Enter the judge passcode
                      </button>
                    </div>
                  )}
                  {m.model && (
                    <p className="text-[12px] text-muted-foreground">
                      {m.model.startsWith('muse-wonder') ? 'Muse Wonder' : 'Muse Spark'}
                      {typeof m.usd === 'number' && ` · $${m.usd < 0.01 ? m.usd.toFixed(4) : m.usd.toFixed(2)}`}
                    </p>
                  )}
                  {m.state === 'stopped' && <p className="text-[14px] text-muted-foreground">Stopped. Send the brief again to restart.</p>}
                  {m.state === 'done' && m.created.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.created.map((id) => {
                        const n = byId.get(id);
                        return n ? <NodeChip key={id} node={n} onClick={() => onChip(id)} /> : null;
                      })}
                    </div>
                  )}
                </MessageContent>
              </div>
            </Message>
          )
        )}

        {waiting && (
          <div className="flex items-center gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0866ff] text-[#ffffff]">
              <Clapperboard className="size-3.5" />
            </span>
            <Shimmer className="text-[14px]">Reading the brief…</Shimmer>
          </div>
        )}

        {!waiting && suggestions.length > 0 && lastAgent?.state !== 'running' && (
          <Suggestions>
            {suggestions.map((s) => (
              <Suggestion key={s} suggestion={s} onClick={onSuggestion} className="rounded-full text-[13px]" />
            ))}
          </Suggestions>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
