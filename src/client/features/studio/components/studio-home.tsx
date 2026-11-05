import { ArrowRight, Clapperboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { createProject, listTemplates, setSessionModel, uploadToProject, type DirectorModel } from '../api';
import { newProject } from '../lib';
import { templateBrief, videoSeconds } from '../template-brief';
import type { StudioProjectSummary, StudioTemplate } from '../types';
import { Composer } from './composer';
import { TemplateCard } from './template-card';
import { TemplateDetailDialog } from './template-detail';

/** A template's prompt for a spot length: the catalog's prompts are written for 30 s. */
const promptFor = (t: StudioTemplate, seconds = 30) =>
  seconds === 30 ? t.prompt : t.prompt.replace(/\b30-second\b/, `${seconds}-second`).replace(/\b30 s\b/, `${seconds} s`);



export interface StudioHomeProps {
  projects: StudioProjectSummary[];
  isLive: boolean;
  onOpenProject: (id: string) => void;
  onProjectsChanged: () => void;
  onOpenTechnical?: () => void;
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
    // A video with no template picked: the agent turns it into a template.
    const video = template ? undefined : files.find((f) => f.type.startsWith('video/'));
    // Demo mode on the deployed site replays a recorded run: a template build, or a spot made from a template.
    if (import.meta.env.PROD && !isLive) {
      const build = projects.find((p) => !p.templateId && p.name.startsWith('Template:'));
      const replay = template
        ? (projects.find((p) => p.templateId === template.id) ?? projects.find((p) => p.templateId))
        : (build ?? projects[0]);
      if (replay) {
        // The project page explains the swap: what they asked, and why they see a recorded run.
        try {
          sessionStorage.setItem(
            'shotprint.demoAsk',
            JSON.stringify({ text: text || (video ? `(attached ${video.name})` : ''), template: template?.title ?? null, same: !template || replay.templateId === template.id, build: !template }),
          );
        } catch {
          /* private mode */
        }
        return onOpenProject(replay.id);
      }
    }
    if (video) {
      try {
        const { id, brief } = templateBrief(video.name, await videoSeconds(video), text);
        const project = await createProject({ ...newProject(brief, null), name: `Template: ${id}` });
        for (const f of files) await uploadToProject(project.id, f);
        onProjectsChanged();
        return onOpenProject(project.id);
      } catch (e) {
        setError(String((e as Error).message || e));
        setBusy(false);
        return;
      }
    }
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
          <h1 className="text-[52px] leading-[1.1] font-medium tracking-[-0.01em] text-foreground">Turn a video into a template</h1>
          <p className="mt-3 text-[16px] text-muted-foreground">Attach a video that works. Muse Code writes a template any agent can run.</p>
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
          {import.meta.env.PROD && !isLive && !error && <p className="mt-2 text-center text-[13px] text-muted-foreground">Demo mode: sending opens a recorded run.</p>}
        </div>

        <section className="mt-14" aria-labelledby="tpl-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="tpl-heading" className="text-[18px] font-medium">Or make a spot from a template</h2>
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
