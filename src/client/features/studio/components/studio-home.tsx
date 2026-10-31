import { ArrowRight, Clapperboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { createProject, listTemplates } from '../api';
import { initialProject, type Attachment } from '../lib';
import type { StudioProjectSummary, StudioTemplate } from '../types';
import { Composer } from './composer';
import { TemplateCard } from './template-card';

const SKILLS = [
  { label: 'Rebuild a reference ad', text: 'Rebuild this reference ad for my product, shot for shot.' },
  { label: 'Swap the product', text: 'Keep the film, the presenter and the cuts. Swap the product for mine.' },
  { label: 'Vertical 9:16 cut', text: 'Make a vertical 9:16 edition for Reels and Shorts.' },
  { label: 'Dissect an ad', text: 'Dissect this ad into a template: cuts, camera moves, lines and sound.' },
];

export interface StudioHomeProps {
  projects: StudioProjectSummary[];
  isLive: boolean;
  onOpenProject: (id: string) => void;
  onProjectsChanged: () => void;
}

/** /studio: a brief box first (chat-native), templates under it so a reviewer sees what is possible. */
export function StudioHome({ projects, onOpenProject, onProjectsChanged }: StudioHomeProps) {
  const [templates, setTemplates] = useState<StudioTemplate[] | null>(null);
  const [draft, setDraft] = useState('');
  const [template, setTemplate] = useState<StudioTemplate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listTemplates()
      .then((ts) => {
        setTemplates(ts);
        const pre = sessionStorage.getItem('studio.template');
        if (pre) {
          sessionStorage.removeItem('studio.template');
          const t = ts.find((x) => x.id === pre);
          if (t) pick(t);
        }
      })
      .catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (t: StudioTemplate) => {
    setTemplate((cur) => (cur?.id === t.id ? null : t));
    setDraft((d) => (d.trim() && !templates?.some((x) => x.prompt === d) ? d : t.prompt));
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (text: string, attachments: Attachment[]) => {
    setBusy(true);
    setError(null);
    try {
      const body = await initialProject(text, template, attachments);
      const project = await createProject({ ...body, state: body.state });
      onProjectsChanged();
      onOpenProject(project.id);
    } catch (e) {
      setError(String((e as Error).message || e));
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div ref={top} className="mx-auto w-full max-w-[1120px] px-6 pt-[9vh] pb-24">
        <div className="mx-auto max-w-[760px] text-center">
          <h1 className="text-[40px] leading-tight tracking-[-0.01em] text-foreground">What are we making?</h1>
          <p className="mt-3 text-[16px] text-muted-foreground">
            Give the director a brief. It rebuilds a dissected ad shot for shot with your product, and every plate, take
            and shot lands on a canvas you can inspect.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-[760px]">
          <Composer
            size="lg"
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            busy={busy}
            template={template}
            onClearTemplate={() => setTemplate(null)}
          />
          {error && <p className="mt-2 px-2 text-[13px] text-[var(--negative)]">{error}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SKILLS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setDraft(s.text)}
                className="h-8 cursor-pointer rounded-[10px] border border-border bg-background px-3 text-[13px] text-muted-foreground transition-colors hover:border-[#c9c9c6] hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-16" aria-labelledby="tpl-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="tpl-heading" className="text-[18px] font-medium">Start from a template</h2>
            <p className="text-[13px] text-muted-foreground">Templates are real ads, dissected into shots, camera setups and lines.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {templates === null
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="overflow-hidden rounded-[16px] border border-border">
                    <div className="aspect-video animate-pulse bg-muted" />
                    <div className="space-y-2 p-3.5">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))
              : templates.map((t) => <TemplateCard key={t.id} template={t} selected={template?.id === t.id} onSelect={pick} />)}
          </div>
        </section>

        {projects.length > 0 && (
          <section className="mt-14" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="mb-3 text-[18px] font-medium">Recent projects</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-[16px] border border-border">
              {projects.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onOpenProject(p.id)}
                    className="flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left hover:bg-[var(--chrome)]"
                  >
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="h-10 w-16 rounded-[8px] object-cover" />
                    ) : (
                      <span className="grid h-10 w-16 place-items-center rounded-[8px] bg-muted">
                        <Clapperboard className="size-4 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{p.name}</span>
                      <span className="block text-[12px] text-muted-foreground">
                        {new Date(p.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-[6px] px-2 py-0.5 text-[12px] font-medium',
                        p.status === 'done'
                          ? 'bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {p.status === 'done' ? 'Finished' : p.status === 'running' ? 'Running' : 'Draft'}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
