/**
 * The brief for turning an attached video into a template. The person only says what they want; the agent
 * picks the goal, tone, cast and industries itself and keeps the template private until they list it.
 */
export function templateBrief(fileName: string, seconds: number | null, note: string) {
  const id = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-template';
  // A short reference keeps its own length: padding it to 30 s only costs time and money.
  const short = seconds !== null && seconds < 25;
  const cuts = short ? `a single cut at the source's own length (about ${Math.round(seconds)} s; do not pad or loop it to 30 s)` : 'cut30 and cut15';
  const brief = [
    note && `${note}`,
    `Turn inputs/${fileName} into a director template named "${id}" with the make-template skill.`,
    `Run bin/dissect inputs/${fileName} --template ${id}, read the boards, and write templates/${id}/ to docs/template_spec.md: TEMPLATE.md, template.json with ${cuts}, a board per shot and the asset set. Finish with bin/template check templates/${id}.`,
    `Then benchmark it: without opening the original footage again, remake ${short ? 'that cut' : 'the 30 s cut'} from the template alone and put the remake next to bin/template reference for a side-by-side.`,
    `Write templates/${id}/catalog.json, private to this workspace, with the goal, tone, cast and industries you judge it fits.`,
  ].filter(Boolean);
  return { id, brief: brief.join('\n\n') };
}

/** The clip's length in seconds, read by the browser; null when it can't tell. */
export function videoSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (s: number | null) => {
      URL.revokeObjectURL(url);
      resolve(s);
    };
    v.preload = 'metadata';
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 5000);
    v.src = url;
  });
}
