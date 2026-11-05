import { ListPlus, X } from 'lucide-react';
import { useState } from 'react';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { cn } from '@/lib/utils';
import type { DirectorModel } from '../api';
import type { StudioTemplate } from '../types';

export interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  /** Called with the message and the attached files (the caller uploads them into the workspace). */
  onSubmit: (text: string, files: File[]) => void | Promise<void>;
  onStop?: () => void;
  /** While Muse works: Enter sends the text into the running turn (MSP turn/steer). */
  onSteer?: (text: string) => void;
  /** While Muse works: queue the text as the next turn (MSP turn/start, ifBusy: queue). */
  onQueue?: (text: string) => void;
  running?: boolean;
  busy?: boolean;
  template?: StudioTemplate | null;
  onClearTemplate?: () => void;
  placeholder?: string;
  size?: 'lg' | 'md';
  allowFiles?: boolean;
  model?: DirectorModel;
  onModelChange?: (m: DirectorModel) => void;
  /** Models this session may use (Wonder needs Live mode). */
  allowedModels?: DirectorModel[];
  footnote?: React.ReactNode;
}

const MODELS: Array<{ id: DirectorModel; name: string; hint: string }> = [
  { id: 'spark', name: 'Muse Spark', hint: 'Fast and cheap' },
  { id: 'wonder', name: 'Muse Wonder', hint: 'Best direction, slower' },
];

async function toFiles(msg: PromptInputMessage): Promise<File[]> {
  const out: File[] = [];
  for (const f of msg.files) {
    if (!f.url || !/^(image|video|audio)\//.test(f.mediaType ?? '')) continue;
    const blob = await (await fetch(f.url)).blob();
    out.push(new File([blob], f.filename || 'upload', { type: f.mediaType }));
  }
  return out;
}

/** The message box (AI Elements PromptInput): brief, template chip, attachments, send/stop. */
export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  onSteer,
  onQueue,
  running,
  busy,
  template,
  onClearTemplate,
  placeholder = 'Attach a video with +, and add a note if you like',
  size = 'md',
  allowFiles = true,
  model,
  onModelChange,
  allowedModels = ['spark', 'wonder'],
  footnote,
}: ComposerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (msg: PromptInputMessage) => {
    if (running) {
      if (msg.text.trim() && onSteer) {
        onSteer(msg.text.trim());
        onChange('');
        return;
      }
      return onStop?.();
    }
    if (!msg.text.trim()) return;
    setError(null);
    setUploading(msg.files.length > 0);
    try {
      await onSubmit(msg.text.trim(), await toFiles(msg));
    } catch (e) {
      setError(String((e as Error).message || e));
      throw e;
    } finally {
      setUploading(false);
    }
  };

  const hasText = value.trim().length > 0;
  const status = running && !hasText ? 'streaming' : busy || uploading ? 'submitted' : undefined;

  return (
    <div>
      <PromptInput
        onSubmit={submit}
        accept="video/*,image/*,audio/*"
        multiple
        globalDrop={allowFiles && size === 'lg'}
        maxFileSize={200 * 1024 * 1024}
        onError={(e) => setError(e.message)}
        className={cn('rounded-[24px] border-border bg-background [&_[data-slot=input-group]]:rounded-[24px] [&_[data-slot=input-group]]:shadow-[0_2px_8px_rgba(17,17,18,0.06),0_2px_16px_rgba(17,17,18,0.04)]', size === 'lg' && 'text-[16px]')}
      >
        {(template || allowFiles) && (
          <PromptInputHeader className="flex-wrap gap-1.5 px-3 pt-3 pb-0 empty:hidden">
            {template && (
              <span className="inline-flex h-8 items-center gap-2 rounded-[10px] border border-border bg-[var(--chrome)] pr-1 pl-1 text-[13px]">
                <img src={template.thumbnail} alt="" className="h-6 w-10 rounded-[6px] object-cover" />
                <span className="max-w-[220px] truncate font-medium">{template.title}</span>
                {onClearTemplate && (
                  <button
                    type="button"
                    aria-label="Remove template"
                    onClick={onClearTemplate}
                    className="grid size-6 cursor-pointer place-items-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </span>
            )}
            <PromptInputAttachments className="w-auto p-0">{(a) => <PromptInputAttachment data={a} />}</PromptInputAttachments>
          </PromptInputHeader>
        )}
        <PromptInputBody>
          <PromptInputTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn('px-4', size === 'lg' ? 'min-h-[76px] text-[16px]' : 'min-h-[52px] text-[15px]')}
          />
        </PromptInputBody>
        <PromptInputFooter className="px-2 pb-2">
          <PromptInputTools>
            {allowFiles && (
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger aria-label="Add reference or product files" />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments label="Add a reference video, photos or footage" />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            )}
          </PromptInputTools>
          {model && onModelChange ? (
            <PromptInputSelect value={model} onValueChange={(v) => onModelChange(v as DirectorModel)}>
              <PromptInputSelectTrigger className="ml-auto h-8 gap-1.5 text-[12px]" aria-label="Model">
                <PromptInputSelectValue>{MODELS.find((m) => m.id === model)?.name}</PromptInputSelectValue>
              </PromptInputSelectTrigger>
              <PromptInputSelectContent align="end">
                {MODELS.map((m) => (
                  <PromptInputSelectItem key={m.id} value={m.id} disabled={!allowedModels.includes(m.id)}>
                    <span className="flex flex-col">
                      <span className="text-[13px]">{m.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {allowedModels.includes(m.id) ? m.hint : `${m.hint} · Live mode`}
                      </span>
                    </span>
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
          ) : (
            <span className="ml-auto pr-2 text-[12px] text-muted-foreground">Muse Code</span>
          )}
          {running && hasText && onQueue && (
            <button
              type="button"
              onClick={() => {
                onQueue(value.trim());
                onChange('');
              }}
              title="Send this after Muse finishes the current turn"
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-[rgba(0,0,0,0.05)] px-3 text-[13px] font-medium hover:bg-[rgba(0,0,0,0.08)]"
            >
              <ListPlus className="size-4" />
              Queue
            </button>
          )}
          <PromptInputSubmit
            status={status}
            aria-label={running ? (hasText ? 'Steer Muse now' : 'Stop') : 'Send'}
            title={running ? (hasText ? 'Steer: Muse reads this before its next step' : 'Stop') : undefined}
            disabled={!running && (!value.trim() || !!busy || uploading)}
            className="rounded-full bg-[var(--meta-blue)] text-white hover:bg-[var(--meta-blue)]/90"
            onClick={(e) => {
              if (running && !hasText) {
                e.preventDefault();
                onStop?.();
              }
            }}
          />
        </PromptInputFooter>
      </PromptInput>
      {error && <p className="mt-2 px-2 text-[13px] text-[var(--negative)]">{error}</p>}
      {footnote && <p className="mt-1.5 px-3 text-[12px] text-muted-foreground">{footnote}</p>}
    </div>
  );
}
