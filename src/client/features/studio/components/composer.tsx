import { ArrowUp, FileVideo, ImageIcon, Loader2, Paperclip, Square, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Attachment } from '../lib';
import type { StudioTemplate } from '../types';

export interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  running?: boolean;
  busy?: boolean;
  template?: StudioTemplate | null;
  onClearTemplate?: () => void;
  attachments?: Attachment[];
  uploading?: number;
  onAttachFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  placeholder?: string;
  size?: 'lg' | 'md';
  autoFocus?: boolean;
}

/** The message box: brief, template chip, attachments, send. Enter sends, Shift+Enter breaks a line. */
export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  running,
  busy,
  template,
  onClearTemplate,
  attachments = [],
  uploading = 0,
  onAttachFiles,
  onRemoveAttachment,
  placeholder = 'Describe the ad you want, or pick a template below',
  size = 'md',
  autoFocus,
}: ComposerProps) {
  const area = useRef<HTMLTextAreaElement | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, size === 'lg' ? 220 : 180)}px`;
  }, [value, size]);

  const canSend = value.trim().length > 0 && !busy && uploading === 0;

  return (
    <div
      className={cn(
        'rounded-[20px] border border-border bg-background transition-colors focus-within:border-[#c9c9c6]',
        size === 'lg' ? 'p-3' : 'p-2.5'
      )}
      onDragOver={(e) => onAttachFiles && e.preventDefault()}
      onDrop={(e) => {
        if (!onAttachFiles || !e.dataTransfer.files.length) return;
        e.preventDefault();
        onAttachFiles([...e.dataTransfer.files]);
      }}
    >
      {(template || attachments.length > 0 || uploading > 0) && (
        <div className="mb-2 flex flex-wrap gap-1.5 px-1">
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
          {attachments.map((a) => (
            <span key={a.id} className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-border bg-[var(--chrome)] pr-1 pl-2.5 text-[13px]">
              {a.type === 'video' ? <FileVideo className="size-3.5" /> : <ImageIcon className="size-3.5" />}
              <span className="max-w-[160px] truncate">{a.name}</span>
              {onRemoveAttachment && (
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => onRemoveAttachment(a.id)}
                  className="grid size-6 cursor-pointer place-items-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </span>
          ))}
          {uploading > 0 && (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-dashed border-border px-2.5 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Uploading {uploading}
            </span>
          )}
        </div>
      )}

      <textarea
        ref={area}
        value={value}
        autoFocus={autoFocus}
        rows={1}
        aria-label="Message the director"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        className={cn(
          'block w-full resize-none bg-transparent px-2 outline-none placeholder:text-muted-foreground',
          size === 'lg' ? 'min-h-[68px] py-2 text-[16px] leading-relaxed' : 'min-h-[44px] py-1.5 text-[15px] leading-relaxed'
        )}
      />

      <div className="mt-1 flex items-center gap-1.5">
        {onAttachFiles && (
          <>
            <input
              ref={file}
              type="file"
              multiple
              accept="video/*,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) onAttachFiles([...e.target.files]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => file.current?.click()}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Paperclip className="size-4" />
              Reference or product
            </button>
          </>
        )}
        <span className="ml-auto pr-1 text-[12px] text-muted-foreground">Director · Muse Wonder</span>
        {running ? (
          <button
            type="button"
            aria-label="Stop"
            onClick={onStop}
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-background hover:bg-muted"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            disabled={!canSend}
            onClick={onSubmit}
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-foreground text-background transition-opacity disabled:cursor-default disabled:opacity-25"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
