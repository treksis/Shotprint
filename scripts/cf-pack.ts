/**
 * Prepares a Cloudflare deploy after `vite build`:
 *  - .cf/templates.json: every template's detail (the Worker has no filesystem to read template.json from)
 *  - dist/tpl/<id>/...: the template page's boards and set, as 1024 px JPEGs
 *  - .cf/seeds.json: the recorded sample projects (their workspaces ship in the project VM image)
 *  - .cf/media/: what stays behind the judge passcode in R2 (benchmarks, reference ads, seed thumbnails)
 *  - dist/.assetsignore: keeps that media out of the public static assets
 *   npx tsx scripts/cf-pack.ts
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO_TEMPLATES } from '../src/shared/studio-templates';
import { readTemplateDetail } from '../src/worker/sandbox/runtime';

const CF = path.resolve('.cf');
const DIST = path.resolve('dist');
fs.rmSync(path.join(CF, 'media'), { recursive: true, force: true });
fs.mkdirSync(path.join(CF, 'media'), { recursive: true });

const details: Record<string, unknown> = {};
let images = 0;
for (const t of STUDIO_TEMPLATES) {
  const d = readTemplateDetail(t.id);
  if (!d) continue;
  details[t.id] = d;
  const files = new Set([...d.cuts.flatMap((c) => c.shots.map((s) => s.board)), ...d.set.map((s) => s.file)].filter(Boolean) as string[]);
  for (const rel of files) {
    const out = path.join(DIST, 'tpl', t.id, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync('sips', ['-Z', '1024', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', path.join('sandbox/templates', t.id, rel), '--out', out], { stdio: 'ignore' });
    images++;
  }
}
fs.writeFileSync(path.join(CF, 'templates.json'), JSON.stringify(details));

// Downloadable packages: the committed template (no source audio) plus the fill recipe and a README.
const tracked = execFileSync('git', ['ls-files', 'sandbox/templates'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const readme = fs.readFileSync('scripts/export-readme.md', 'utf8');
fs.rmSync(path.join(DIST, 'exports'), { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'exports'), { recursive: true });
for (const t of STUDIO_TEMPLATES) {
  const files = tracked.filter((f) => f.startsWith(`sandbox/templates/${t.id}/`));
  if (!files.length) continue;
  const stage = path.join(CF, 'export', t.id);
  fs.rmSync(stage, { recursive: true, force: true });
  for (const f of files) {
    const out = path.join(stage, 'template', f.slice(`sandbox/templates/${t.id}/`.length));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(f, out);
  }
  fs.mkdirSync(path.join(stage, 'recipe'), { recursive: true });
  fs.copyFileSync('sandbox/kit/.claude/skills/template-fill/SKILL.md', path.join(stage, 'recipe/SKILL.md'));
  fs.copyFileSync('sandbox/kit/docs/template_spec.md', path.join(stage, 'recipe/template_spec.md'));
  fs.writeFileSync(path.join(stage, 'README.md'), readme.replace('{{title}}', t.title));
  execFileSync('zip', ['-qr', path.join(DIST, 'exports', `${t.id}.zip`), t.id], { cwd: path.join(CF, 'export') });
}

const seeds = fs
  .readdirSync('sandbox/seeds')
  .sort()
  .filter((slug) => fs.existsSync(path.join('sandbox/seeds', slug, 'seed.json')))
  .map((slug) => {
    const meta = JSON.parse(fs.readFileSync(path.join('sandbox/seeds', slug, 'seed.json'), 'utf8'));
    let thumbnail: string | null = null;
    if (meta.thumbnail) {
      const out = path.join(CF, 'media/seeds', slug, 'thumb.jpg');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      execFileSync('sips', ['-Z', '640', '-s', 'format', 'jpeg', path.join('sandbox/seeds', slug, 'workspace', meta.thumbnail), '--out', out], { stdio: 'ignore' });
      thumbnail = `/media/seeds/${slug}/thumb.jpg`;
    }
    return { slug, name: meta.name, prompt: meta.prompt, templateId: meta.templateId ?? null, thumbnail };
  });
fs.writeFileSync(path.join(CF, 'seeds.json'), JSON.stringify(seeds, null, 2));

for (const dir of ['proof', 'examples']) {
  fs.cpSync(path.join('public/templates', dir), path.join(CF, 'media/templates', dir), { recursive: true });
  fs.rmSync(path.join(DIST, 'templates', dir), { recursive: true, force: true });
}
fs.writeFileSync(path.join(DIST, '.assetsignore'), 'templates/proof\ntemplates/examples\n');
console.log(`templates ${Object.keys(details).length}, images ${images}, seeds ${seeds.length}`);
