import { ArrowRight, Clapperboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { createProject, listTemplates, setSessionModel, uploadToProject, type DirectorModel } from '../api';
import { newProject } from '../lib';
import type { StudioProjectSummary, StudioTemplate } from '../types';
import { Composer } from './composer';
import { TemplateCard } from './template-card';
import { TemplateDetailDialog } from './template-detail';

/** A template's prompt for a spot length: the catalog's prompts are written for 30 s. */
const promptFor = (t: StudioTemplate, seconds = 30) => (seconds === 30 ? t.prompt : t.prompt.replace(/\b30-second\b/, `${seconds}-second`));

const SKILLS = [
  { label: 'Remake a video', text: 'Remake this reference video shot for shot with my own subject.' },
  { label: 'Swap the subject', text: 'Keep the film, the camera work and the cuts. Swap the subject for mine.' },
  { label: 'Vertical 9:16 cut', text: 'Make a vertical 9:16 edition for Reels and Stories.' },
  { label: 'Dissect a video', text: 'Dissect this video into a template: cuts, camera moves, lines and sound.' },
];

export interface StudioHomeProps {
  projects: StudioProjectSummary[];
  isLive: boolean;
  onOpenProject: (id: string) => void;
  onProjectsChanged: () => void;
}

/** /studio: a brief box first (chat-native), templates under it so a reviewer sees what is possible. */
export function StudioHome({ projects, isLive, onOpenProject, onProjectsChanged }: StudioHomeProps) {
  const [templates, setTemplates] = useState<StudioTemplate[] | null>(null);
  const [draft, setDraft] = useState('');
  const [template, setTemplate] = useState<StudioTemplate | null>(null);
  const [details, setDetails] = useState<StudioTemplate | null>(null);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<DirectorModel>(() => (localStorage.getItem('museclone.director.model') as DirectorModel) || 'spark');
  const allowed: DirectorModel[] = isLive || import.meta.env.DEV ? ['spark', 'wonder'] : ['spark'];
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listTemplates()
      .then((ts) => {
        setTemplates(ts);
        const pre = sessionStorage.getItem('studio.template');
        const seconds = Number(sessionStorage.getItem('studio.template.seconds')) || 30;
        if (pre) {
          sessionStorage.removeItem('studio.template');
          sessionStorage.removeItem('studio.template.seconds');
          const t = ts.find((x) => x.id === pre);
          if (t) pick(t, seconds, ts);
        }
      })
      .catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (t: StudioTemplate, seconds?: number, all = templates) => {
    // A length chosen on the template page always applies; a plain click toggles the template.
    setTemplate((cur) => (cur?.id === t.id && !seconds ? null : t));
    const isTemplatePrompt = (d: string) => all?.some((x) => d === x.prompt || d === promptFor(x, 15));
    setDraft((d) => (d.trim() && !isTemplatePrompt(d) ? d : promptFor(t, seconds)));
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (text: string, files: File[]) => {
    setBusy(true);
    setError(null);
    try {
      // Files go into the new workspace's inputs/ before its first turn, so the brief can use them.
      const project = await createProject(newProject(files.length ? `${text}\n\nMy files are in inputs/.` : text, template));
      for (const f of files) await uploadToProject(project.id, f);
      if (model !== 'spark') await setSessionModel(project.id, model);
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
          <h1 className="text-[52px] leading-[1.1] font-medium tracking-[-0.01em] text-foreground">What are we making?</h1>
          <p className="mt-3 text-[16px] text-muted-foreground">
            Brief Muse Code. It works in its own sandbox, writing plans, making stills and rendering shots, and every
            file it makes lands on a canvas you can inspect, rewire and steer while it works.
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
            model={model}
            onModelChange={(m) => {
              setModel(m);
              localStorage.setItem('museclone.director.model', m);
            }}
            allowedModels={allowed}
          />
          {error && <p className="mt-2 px-2 text-[13px] text-[var(--negative)]">{error}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SKILLS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setDraft(s.text)}
                className="h-9 cursor-pointer rounded-full bg-[rgba(0,0,0,0.05)] px-4 text-[14px] font-medium text-foreground transition-colors hover:bg-[rgba(0,0,0,0.08)]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-16" aria-labelledby="tpl-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="tpl-heading" className="text-[18px] font-medium">Start from a template</h2>
            <p className="text-[13px] text-muted-foreground">Real ads taken apart into a recipe, an ingredient set and storyboards. Each makes a 30 s and a 15 s spot.</p>
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
              : templates.map((t) => (
                  <TemplateCard key={t.id} template={t} selected={template?.id === t.id} onSelect={(x) => pick(x)} onDetails={setDetails} />
                ))}
          </div>
          <TemplateDetailDialog
            template={details}
            onClose={() => setDetails(null)}
            onUse={(t, seconds) => {
              setDetails(null);
              pick(t, seconds);
            }}
          />
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
