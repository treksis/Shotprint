import { X } from 'lucide-react';
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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { cn } from '@/lib/utils';
import { uploadFile } from '../api';
import { newId, type Attachment } from '../lib';
import type { StudioTemplate } from '../types';

export interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  /** Called with the brief and the uploaded files (already stored server-side). */
  onSubmit: (text: string, attachments: Attachment[]) => void | Promise<void>;
  onStop?: () => void;
  running?: boolean;
  busy?: boolean;
  template?: StudioTemplate | null;
  onClearTemplate?: () => void;
  placeholder?: string;
  size?: 'lg' | 'md';
  allowFiles?: boolean;
}

async function toUploaded(msg: PromptInputMessage): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of msg.files) {
    const type = f.mediaType?.startsWith('video/') ? 'video' : f.mediaType?.startsWith('image/') ? 'image' : null;
    if (!type || !f.url) continue;
    const blob = await (await fetch(f.url)).blob();
    const file = new File([blob], f.filename || `upload.${type === 'video' ? 'mp4' : 'png'}`, { type: f.mediaType });
    const r = await uploadFile(file);
    out.push({ id: newId('a'), name: file.name, url: r.url, type });
  }
  return out;
}

/** The message box (AI Elements PromptInput): brief, template chip, attachments, send/stop. */
export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  running,
  busy,
  template,
  onClearTemplate,
  placeholder = 'Describe the video you want, or pick a template below',
  size = 'md',
  allowFiles = true,
}: ComposerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (msg: PromptInputMessage) => {
    if (running) return onStop?.();
    if (!msg.text.trim()) return;
    setError(null);
    setUploading(msg.files.length > 0);
    try {
      const attachments = await toUploaded(msg);
      await onSubmit(msg.text.trim(), attachments);
    } catch (e) {
      setError(String((e as Error).message || e));
      throw e;
    } finally {
      setUploading(false);
    }
  };

  const status = running ? 'streaming' : busy || uploading ? 'submitted' : undefined;

  return (
    <div>
      <PromptInput
        onSubmit={submit}
        accept="video/*,image/*"
        multiple
        globalDrop={allowFiles && size === 'lg'}
        maxFileSize={200 * 1024 * 1024}
        onError={(e) => setError(e.message)}
        className={cn('rounded-[20px] border-border bg-background [&_[data-slot=input-group]]:rounded-[20px]', size === 'lg' && 'text-[16px]')}
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
          <span className="ml-auto pr-2 text-[12px] text-muted-foreground">Director · Muse Wonder</span>
          <PromptInputSubmit
            status={status}
            disabled={!running && (!value.trim() || !!busy || uploading)}
            className="rounded-full"
            onClick={(e) => {
              if (running) {
                e.preventDefault();
                onStop?.();
              }
            }}
          />
        </PromptInputFooter>
      </PromptInput>
      {error && <p className="mt-2 px-2 text-[13px] text-[var(--negative)]">{error}</p>}
    </div>
  );
}
