import fs from 'node:fs';
import path from 'node:path';
import type { StudioStore } from '../studio/store';
import { hostRoot } from './docker';

const SEEDS = path.resolve('sandbox/seeds');

interface SeedMeta {
  name: string;
  prompt: string;
  templateId: string | null;
  /** Workspace path of the picture shown in the sidebar and project list. */
  thumbnail?: string;
  model?: 'spark' | 'wonder';
}

/**
 * Sample projects are finished Muse Code sessions recorded in sandbox/seeds/<slug>/: the workspace
 * (with its .studio/events.jsonl transcript) and seed.json. An empty project list gets one copy of
 * each; opening it replays the session as it ran, and chatting continues in a fresh session.
 */
export async function seedProjects(store: StudioStore) {
  if (!fs.existsSync(SEEDS) || (await store.list()).length) return;
  for (const slug of fs.readdirSync(SEEDS).sort()) {
    const dir = path.join(SEEDS, slug);
    const metaFile = path.join(dir, 'seed.json');
    if (!fs.existsSync(metaFile) || !fs.existsSync(path.join(dir, 'workspace'))) continue;
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as SeedMeta;
    const p = await store.create({ name: meta.name, prompt: meta.prompt, templateId: meta.templateId, thumbnail: null, state: { positions: {} } });
    const root = hostRoot(p.id);
    fs.cpSync(path.join(dir, 'workspace'), root, { recursive: true });
    // The brief already ran; there is no live session to resume in a new container.
    fs.writeFileSync(path.join(root, '.studio/session.json'), JSON.stringify({ briefSent: true, model: meta.model ?? 'spark' }, null, 2));
    fs.writeFileSync(path.join(root, '.arm'), `museclone-${p.id}`);
    const done = fs.existsSync(path.join(root, 'final'));
    await store.update(p.id, {
      status: done ? 'done' : 'draft',
      thumbnail: meta.thumbnail ? `/api/studio/projects/${p.id}/files/${meta.thumbnail}` : null,
    });
    console.log(`[studio] seeded sample project "${meta.name}" (${p.id})`);
  }
}
