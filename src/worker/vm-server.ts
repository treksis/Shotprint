import fs from 'node:fs';
import { serve } from '@hono/node-server';
import type { StudioProject } from '../shared/studio';
import { app } from './index';
import { hostRoot } from './sandbox/docker';
import { dockerSandbox } from './sandbox/runtime';
import { copySeed } from './sandbox/seeds';
import { setStudioSandbox } from './studio/sandbox';
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
    return app.fetch(req, process.env as any);
  },
});
console.log(`[vm] Shotprint project VM listening on :${port}`);
