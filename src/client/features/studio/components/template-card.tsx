import { BadgeCheck, Check, Columns2 } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { StudioTemplate } from '../types';

/** A template in the gallery: hover plays a few seconds of the source film. */
export function TemplateCard({
  template,
  selected,
  onSelect,
  onDetails,
}: {
  template: StudioTemplate;
  selected?: boolean;
  onSelect: (t: StudioTemplate) => void;
  /** Opens the template page (benchmark, storyboard, assets). */
  onDetails?: (t: StudioTemplate) => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const t = template;
  return (
    <div className="relative flex">
      <button
        type="button"
        aria-pressed={selected}
        title={t.proof ? 'Benchmarked: regenerated from this template alone and compared with the original' : undefined}
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
          'group flex w-full cursor-pointer flex-col overflow-hidden rounded-[16px] border bg-background text-left transition-colors',
          selected ? 'border-foreground' : 'border-border hover:border-[#c9c9c6]'
        )}
      >
        <span className="relative block aspect-video overflow-hidden bg-muted">
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
          <span className="line-clamp-1 text-[13px] text-muted-foreground">{t.creator ? `by ${t.creator}` : t.source}</span>
          {t.goal && (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {[t.goal, t.tone, ...(t.industries ?? []).slice(0, 1), t.cast].filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-[6px] bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {tag}
                </span>
              ))}
            </span>
          )}
          <span className="mt-1.5 truncate text-[12px] text-muted-foreground tabular-nums">
            {t.cuts?.length ? t.cuts.map((c) => `${c} s`).join(' / ') : `${Math.round(t.durationSec)} s`}
            {' · '}
            {t.shotsMeasured ? `${t.shots} shots` : `~${t.shots} shots`}
            {t.setups ? ` · ${t.setups} setups` : ''}
          </span>
          <span className="mt-auto flex h-7 items-center pt-3 pr-24">
            {t.status === 'ready' ? (
              <span className="inline-flex h-6 items-center gap-1 rounded-[6px] bg-[var(--pill-positive-bg)] px-2 text-[12px] font-medium whitespace-nowrap text-[var(--pill-positive-ink)]">
                {t.proof && <BadgeCheck className="size-3.5" />}
                {t.proof ? 'Benchmarked' : 'Agent-ready'}
              </span>
            ) : (
              <span className="inline-flex h-6 items-center rounded-[6px] bg-muted px-2 text-[12px] font-medium whitespace-nowrap text-muted-foreground">
                In preparation
              </span>
            )}
          </span>
        </span>
      </button>
      {onDetails && t.status === 'ready' && (
        <button
          type="button"
          onClick={() => onDetails(t)}
          className="absolute right-3 bottom-3 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-[var(--chrome)]"
        >
          <Columns2 className="size-3.5" />
          {t.proof ? 'Compare' : 'Details'}
        </button>
      )}
    </div>
  );
}
