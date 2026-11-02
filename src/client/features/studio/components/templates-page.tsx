import { useEffect, useState } from 'react';
import { listTemplates } from '../api';
import type { StudioTemplate } from '../types';
import { TemplateCard } from './template-card';
import { TemplateDetailDialog } from './template-detail';

/** /templates: every template; a ready one opens its page (proof, storyboard, ingredient set). */
export function TemplatesPage({ onUseTemplate }: { onUseTemplate: (id: string, seconds?: number) => void }) {
  const [templates, setTemplates] = useState<StudioTemplate[] | null>(null);
  const [open, setOpen] = useState<StudioTemplate | null>(null);
  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] px-6 pt-10 pb-24">
        <h1 className="text-[32px] leading-tight">Templates</h1>
        <p className="mt-2 max-w-[680px] text-[15px] text-muted-foreground">
          Production-ready formats built from top-performing ads: measured timing, framing, camera, lighting, text and
          sound for every shot, a storyboard per shot, and swappable assets for cast, product, locations, screens, voice
          and music. Each delivers a <span className="text-foreground">30 s and a 15 s cut</span>.{' '}
          <span className="text-foreground">Benchmarked</span> templates were regenerated end to end from the template
          alone and compared side by side with the original.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(templates ?? []).map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onSelect={() => (t.status === 'ready' ? setOpen(t) : onUseTemplate(t.id))}
              onDetails={setOpen}
            />
          ))}
        </div>
        <TemplateDetailDialog template={open} onClose={() => setOpen(null)} onUse={(t, seconds) => onUseTemplate(t.id, seconds)} />
      </div>
    </div>
  );
}
