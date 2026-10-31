import { useEffect, useState } from 'react';
import { listTemplates } from '../api';
import type { StudioTemplate } from '../types';
import { TemplateCard } from './template-card';

/** /templates: every template, with what "ready" and "reference" mean. */
export function TemplatesPage({ onUseTemplate }: { onUseTemplate: (id: string) => void }) {
  const [templates, setTemplates] = useState<StudioTemplate[] | null>(null);
  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] px-6 pt-10 pb-24">
        <h1 className="text-[32px] leading-tight">Templates</h1>
        <p className="mt-2 max-w-[640px] text-[15px] text-muted-foreground">
          A template is a real film taken apart: every cut timed, every camera setup and move measured, every line given a
          job and a syllable budget. <span className="text-foreground">Ready</span> templates have been dissected and
          proven with a judged film. <span className="text-foreground">References</span> are in the library and get
          dissected the first time you use them, in Live mode.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(templates ?? []).map((t) => (
            <TemplateCard key={t.id} template={t} onSelect={() => onUseTemplate(t.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
