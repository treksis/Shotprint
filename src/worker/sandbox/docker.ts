import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const REPO = process.cwd();
export const IMAGE = process.env.STUDIO_SANDBOX_IMAGE || 'muse-harness';
const KIT = path.join(REPO, 'sandbox/kit');
const HOST = path.join(REPO, 'sandbox/host');
const TEMPLATES = path.join(REPO, 'sandbox/templates');
const WORKSPACES = path.join(REPO, '.data/workspaces');

/**
 * The sandbox runtime. On a Mac with Apple's `container` installed every project gets its own lightweight
 * VM (its own Linux kernel, CPU and memory), the same isolation as Cloudflare's sandbox in production;
 * otherwise Docker. Both CLIs take the same run/exec/start arguments. STUDIO_SANDBOX_RUNTIME overrides.
 */
export const RUNTIME: 'container' | 'docker' =
  process.env.STUDIO_SANDBOX_RUNTIME === 'docker' || process.env.STUDIO_SANDBOX_RUNTIME === 'container'
    ? process.env.STUDIO_SANDBOX_RUNTIME
    : process.platform === 'darwin' && ['/opt/homebrew/bin/container', '/usr/local/bin/container'].some((p) => fs.existsSync(p))
      ? 'container'
      : 'docker';
const CLI = RUNTIME;

export const containerName = (projectId: string) => `museclone-${projectId.replace(/[^a-zA-Z0-9_.-]/g, '')}`;
export const hostRoot = (projectId: string) => path.join(WORKSPACES, projectId.replace(/[^a-zA-Z0-9_.-]/g, ''));

/**
 * Where the workspace sits inside the sandbox. Muse Code checks that a file it opened resolves to the
 * path it asked for; Docker Desktop on macOS reports bind-mounted files under /run/host_virtiofs/<host
 * path>, so there the workspace is mounted at exactly that path. Apple's VMs and Linux use the host path.
 */
export const sandboxRoot = (projectId: string) =>
  RUNTIME === 'docker' && process.platform === 'darwin' ? `/run/host_virtiofs${hostRoot(projectId)}` : hostRoot(projectId);

let dockerOk: Promise<boolean> | null = null;
export function dockerAvailable(): Promise<boolean> {
  dockerOk ??= run(CLI, ['image', 'inspect', IMAGE], { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  return dockerOk;
}

/** First visit: copy the kit (instructions, tools, skills) and the picked template into the workspace. */
export function seedWorkspace(projectId: string, opts: { templateId: string | null; templateVideo?: string | null }) {
  const root = hostRoot(projectId);
  if (fs.existsSync(path.join(root, 'AGENTS.md'))) return root;
  fs.mkdirSync(root, { recursive: true });
  fs.cpSync(KIT, root, { recursive: true });
  for (const d of ['inputs', 'notes', 'plates', 'jobs', 'renders', 'final', '.studio']) fs.mkdirSync(path.join(root, d), { recursive: true });
  fs.rmSync(path.join(root, 'inputs/.keep'), { force: true });
  if (opts.templateId && fs.existsSync(path.join(TEMPLATES, opts.templateId))) {
    fs.cpSync(path.join(TEMPLATES, opts.templateId), path.join(root, 'templates', opts.templateId), { recursive: true });
  }
  if (opts.templateVideo && fs.existsSync(opts.templateVideo)) {
    fs.copyFileSync(opts.templateVideo, path.join(root, 'inputs', `reference${path.extname(opts.templateVideo)}`));
  }
  // bin/h3 (the lab renderer) reads these: the clip cap and the name its renders are filed under.
  fs.writeFileSync(path.join(root, '.arm'), containerName(projectId));
  fs.writeFileSync(path.join(root, '.clip_cap'), String(process.env.STUDIO_CLIP_CAP || 24));
  return root;
}

async function state(name: string): Promise<'running' | 'stopped' | 'missing'> {
  try {
    if (RUNTIME === 'container') {
      const { stdout } = await run(CLI, ['inspect', name], { timeout: 8000 });
      const [c] = JSON.parse(stdout || '[]') as { status?: { state?: string } }[];
      return !c ? 'missing' : c.status?.state === 'running' ? 'running' : 'stopped';
    }
    const { stdout } = await run(CLI, ['inspect', '-f', '{{.State.Running}}', name], { timeout: 8000 });
    return stdout.trim() === 'true' ? 'running' : 'stopped';
  } catch {
    return 'missing';
  }
}

/** The project's container, created or restarted as needed. It idles on `sleep` between turns. */
export async function ensureContainer(projectId: string): Promise<string> {
  const name = containerName(projectId);
  const s = await state(name);
  if (s === 'running') return name;
  if (s === 'stopped') {
    await run(CLI, ['start', name], { timeout: 30_000 });
    return name;
  }
  const root = sandboxRoot(projectId);
  await run(
    CLI,
    [
      'run', '-d', '--name', name,
      '--label', `museclone.project=${projectId}`,
      '--memory', process.env.STUDIO_SANDBOX_MEMORY || '4g',
      '--cpus', process.env.STUDIO_SANDBOX_CPUS || '2',
      '-e', 'META_API_KEY',
      '-v', `${hostRoot(projectId)}:${root}`,
      '-v', `${HOST}:/opt/studio:ro`,
      '-w', root,
      IMAGE, 'sleep', 'infinity',
    ],
    { timeout: 60_000, env: process.env }
  );
  return name;
}

export async function relayRunning(name: string): Promise<boolean> {
  try {
    await run(CLI, ['exec', name, 'test', '-S', '/tmp/studio-msp.sock'], { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

/** Start `muse serve` behind the relay (detached, so it outlives this server process). */
export async function startRelay(projectId: string, name: string, modelId: string) {
  const root = sandboxRoot(projectId);
  await run(
    CLI,
    [
      'exec', '-d', '-w', root, name,
      'node', '/opt/studio/relay.mjs', 'serve', `${root}/.studio/events.jsonl`, '--',
      'muse', 'serve', '--disable-sandbox', '--trust-workspace', '--disable-request-user-input',
      '--provider', 'meta', '--model', modelId,
    ],
    { timeout: 20_000 }
  );
  for (let i = 0; i < 50; i++) {
    if (await relayRunning(name)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Muse Code did not start in the sandbox');
}

export function connectRelay(name: string) {
  return spawn(CLI, ['exec', '-i', name, 'node', '/opt/studio/relay.mjs', 'connect'], { stdio: ['pipe', 'pipe', 'pipe'] });
}

/** Tear the project's sandbox down (the workspace stays on the host). */
export function removeContainer(projectId: string) {
  return new Promise((res) => spawn(CLI, ['rm', '-f', containerName(projectId)], { stdio: 'ignore' }).on('exit', res).on('error', res));
}

/** A poster frame for a clip, cached next to the workspace's other Studio files. */
export async function posterFor(root: string, rel: string, mtimeMs: number): Promise<string | null> {
  const out = path.join(root, '.studio/thumbs', `${rel.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.round(mtimeMs)}.jpg`);
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    await run('ffmpeg', ['-y', '-ss', '0.5', '-i', path.join(root, rel), '-frames:v', '1', '-vf', 'scale=480:-2', out, '-loglevel', 'error'], { timeout: 20_000 });
    return fs.existsSync(out) ? out : null;
  } catch {
    return null;
  }
}
