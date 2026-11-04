import fs from 'node:fs';
import { serve } from '@hono/node-server';
import type { StudioProject } from '../shared/studio';
import { app } from './index';
import { hostRoot } from './sandbox/docker';
import { dockerSandbox } from './sandbox/runtime';
import { copySeed } from './sandbox/seeds';
import { setStudioSandbox, studioSandbox } from './studio/sandbox';
import { setStudioStore } from './studio/store';

/**
 * The Studio server inside one project's Cloudflare container (its own microVM). The Worker keeps the
 * project list in D1 and forwards this project's session routes here with the project in X-Studio-Project;
 * Muse Code runs next to this server (STUDIO_SANDBOX_RUNTIME=local), the workspace on the VM's own disk.
 */
let project: StudioProject | null = null;

setStudioStore({
  list: async () => [],
  get: async (id) => (project?.id === id ? project : null),
  create: async () => {
    throw new Error('projects are created by the Worker');
  },
  update: async (id, patch) => (project?.id === id ? (project = { ...project, ...patch } as StudioProject) : null),
  remove: async () => true,
});
setStudioSandbox(dockerSandbox);
// The Worker already checked the judge passcode before forwarding.
process.env.STUDIO_OPEN = '1';

/** This VM's life: its spend counter starts over when a sleeping VM wakes, so the Worker sums lives. */
const BOOT = Math.random().toString(36).slice(2, 10);
/** A sample project replays its recorded session, spend included; only what is spent after that counts. */
let baseline: number | null = null;

const port = Number(process.env.PORT || 8080);
serve({
  port,
  fetch: (req) => {
    const raw = req.headers.get('x-studio-project');
    if (raw && !project) {
      project = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as StudioProject;
      const seed = (project.state as { seed?: string } | undefined)?.seed;
      if (seed && !fs.existsSync(hostRoot(project.id))) copySeed(seed, project.id);
    }
    // The Worker's budget checks: what this VM life has spent, and a stop when the shared budget is gone.
    const { pathname } = new URL(req.url);
    if (project && (pathname === '/__usage' || pathname === '/__stop')) return vmControl(pathname, project);
    return app.fetch(req, process.env as any);
  },
});
console.log(`[vm] Shotprint project VM listening on :${port}`);

async function vmControl(pathname: string, p: StudioProject) {
  const s = await studioSandbox()!.open(p);
  // The session reads its event log only while someone watches; catch up so spend (and the cap) is current.
  s.subscribe(() => undefined)();
  if (pathname === '/__stop') await s.interrupt().catch(() => undefined);
  const v = s.view();
  baseline ??= (p.state as { seed?: string } | undefined)?.seed ? v.usd : 0;
  return Response.json({ boot: BOOT, usd: Math.max(0, v.usd - baseline), status: v.status });
}
