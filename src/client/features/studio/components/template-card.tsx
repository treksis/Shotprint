import { Check } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { StudioTemplate } from '../types';

/** A template in the gallery: hover plays a few seconds of the source film. */
export function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: StudioTemplate;
  selected?: boolean;
  onSelect: (t: StudioTemplate) => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const t = template;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(t)}
      onMouseEnter={() => video.current?.play().catch(() => undefined)}
      onMouseLeave={() => {
        if (!video.current) return;
        video.current.pause();
        video.current.currentTime = 0;
      }}
      onFocus={() => video.current?.play().catch(() => undefined)}
      onBlur={() => video.current?.pause()}
      className={cn(
        'group flex cursor-pointer flex-col overflow-hidden rounded-[16px] border bg-background text-left transition-colors',
        selected ? 'border-foreground' : 'border-border hover:border-[#c9c9c6]'
      )}
    >
      <span className="relative block aspect-video overflow-hidden bg-[#111]">
        <img src={t.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <video
          ref={video}
          src={t.preview}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100"
        />
        {selected && (
          <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-background text-foreground">
            <Check className="size-3.5" />
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="text-[15px] font-medium leading-snug">{t.title}</span>
        <span className="line-clamp-1 text-[13px] text-muted-foreground">{t.source}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
          <span className="tabular-nums">{Math.round(t.durationSec)} s</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {t.shotsMeasured ? `${t.shots} shots` : `~${t.shots} cuts detected`}
          </span>
          {t.setups && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t.setups} camera setups</span>
            </>
          )}
        </span>
        <span className="mt-2.5">
          {t.status === 'ready' ? (
            <span className="inline-flex h-6 items-center rounded-[6px] bg-[var(--pill-positive-bg)] px-2 text-[12px] font-medium text-[var(--pill-positive-ink)]">
              Ready · dissected shot by shot
            </span>
          ) : (
            <span className="inline-flex h-6 items-center rounded-[6px] bg-muted px-2 text-[12px] font-medium text-muted-foreground">
              Reference · needs dissection
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
