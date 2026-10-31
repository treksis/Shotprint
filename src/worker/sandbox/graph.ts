import fs from 'node:fs';
import path from 'node:path';
import type { Lane, NodeKind, StudioEdge, WorkspaceGraph } from '../../shared/studio';
import { posterFor } from './docker';

type GraphNode = WorkspaceGraph['nodes'][number];

const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const VIDEO = /\.(mp4|mov|webm|m4v)$/i;
const AUDIO = /\.(wav|mp3|m4a|aac|flac|ogg)$/i;
/** Workspace plumbing that never appears on the canvas. */
const HIDDEN_DIRS = new Set(['bin', 'tools', 'docs', 'node_modules', '__pycache__', '_prev', 'frames', 'work']);
const HIDDEN_FILES = new Set(['AGENTS.md', 'TOOLS.md', 'CLAUDE.md']);
const MAX_FILES = 400;

export interface Activity {
  /** Files a running command is about to write (`bin/img --out x`, ffmpeg's last argument...). */
  writing: Set<string>;
  /** Jobs files a running `bin/h3` call is rendering. */
  rendering: Set<string>;
}

function walk(root: string, rel = '', out: Array<{ rel: string; mtimeMs: number; size: number }> = []) {
  if (out.length >= MAX_FILES) return out;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (HIDDEN_DIRS.has(e.name) || r === 'templates') continue;
      walk(root, r, out);
    } else if (e.isFile() && !HIDDEN_FILES.has(e.name)) {
      const st = fs.statSync(path.join(root, r));
      out.push({ rel: r, mtimeMs: st.mtimeMs, size: st.size });
    }
  }
  return out;
}

function readJsonl(file: string): any[] {
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .flatMap((l) => {
        try {
          return [JSON.parse(l)];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const norm = (p: unknown) => (typeof p === 'string' ? path.posix.normalize(p.replace(/^\.\//, '')) : null);
const mb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

function classify(rel: string): { kind: NodeKind; lane: Lane; media?: 'image' | 'video' | 'audio' } | null {
  const top = rel.split('/')[0];
  const media = IMAGE.test(rel) ? 'image' : VIDEO.test(rel) ? 'video' : AUDIO.test(rel) ? 'audio' : undefined;
  if (top === 'inputs') return media ? { kind: 'upload', lane: 'inputs', media } : rel.endsWith('.md') ? { kind: 'note', lane: 'inputs' } : null;
  if (rel.endsWith('.md')) return { kind: 'note', lane: 'fill' };
  if (top === 'final' && media === 'video') return { kind: 'final', lane: 'final', media };
  if (media === 'audio') return { kind: 'take', lane: 'takes', media };
  if (media === 'video') return { kind: 'clip', lane: 'clips', media };
  if (media === 'image') return { kind: top === 'plates' ? 'plate' : 'image', lane: 'plates', media };
  return null;
}

/** The canvas: every file the agent made, wired by the agent's own records. */
export async function scanWorkspace(root: string, projectId: string, activity: Activity): Promise<WorkspaceGraph> {
  const fileUrl = (rel: string, v: number) => `/api/studio/projects/${projectId}/files/${rel.split('/').map(encodeURIComponent).join('/')}?v=${Math.round(v)}`;
  const nodes = new Map<string, GraphNode>();
  const edges: StudioEdge[] = [];
  const edge = (from: unknown, to: unknown, role: string, user = false) => {
    const f = norm(from);
    const t = norm(to);
    if (f && t && f !== t && !edges.some((e) => e.from === f && e.to === t)) edges.push(user ? { from: f, to: t, role, user } : { from: f, to: t, role });
  };

  for (const f of walk(root)) {
    const c = classify(f.rel);
    if (!c) continue;
    const name = path.posix.basename(f.rel);
    const node: GraphNode = { id: f.rel, kind: c.kind, lane: c.lane, label: name, sub: f.rel.includes('/') ? path.posix.dirname(f.rel) : undefined, status: 'done', meta: { mtime: f.mtimeMs, size: f.size } };
    if (c.media) {
      node.media = { type: c.media, src: fileUrl(f.rel, f.mtimeMs) };
      node.sub = `${path.posix.dirname(f.rel) === '.' ? '' : `${path.posix.dirname(f.rel)} · `}${mb(f.size)}`;
      if (c.media === 'video') {
        const poster = await posterFor(root, f.rel, f.mtimeMs);
        if (poster) node.media.poster = fileUrl(path.relative(root, poster), f.mtimeMs);
      }
    } else if (c.kind === 'note') {
      const text = fs.readFileSync(path.join(root, f.rel), 'utf8');
      const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
      node.label = title?.slice(0, 80) || name;
      node.text = text.replace(/^#\s+.+\n?/, '').slice(0, 4000);
      node.sub = f.rel;
    }
    nodes.set(f.rel, node);
  }

  // Templates: one node each, with the reference frame as its picture.
  const tdir = path.join(root, 'templates');
  for (const t of fs.existsSync(tdir) ? fs.readdirSync(tdir) : []) {
    const md = path.join(tdir, t, 'TEMPLATE.md');
    if (!fs.existsSync(md)) continue;
    const text = fs.readFileSync(md, 'utf8');
    const frames = path.join(tdir, t, 'frames');
    const first = fs.existsSync(frames) ? fs.readdirSync(frames).filter((x) => IMAGE.test(x)).sort()[0] : undefined;
    const id = `templates/${t}/TEMPLATE.md`;
    nodes.set(id, {
      id,
      kind: 'template',
      lane: 'inputs',
      label: text.match(/^#\s+(.+)$/m)?.[1]?.replace(/^Template:\s*/i, '').trim().slice(0, 80) || t,
      sub: `templates/${t}`,
      status: 'done',
      text: text.slice(0, 4000),
      media: first ? { type: 'image', src: fileUrl(`templates/${t}/frames/${first}`, 0) } : undefined,
    });
  }

  // Stills: bin/img's ledger says what each edit was made from (latest entry per output wins).
  const madeFrom = new Map<string, { inputs: string[]; prompt?: string }>();
  for (const e of readJsonl(path.join(root, '.studio/ledger.jsonl'))) if (e?.out) madeFrom.set(norm(e.out)!, { inputs: (e.inputs ?? []).map(norm), prompt: e.prompt });
  for (const [out, m] of madeFrom) {
    const n = nodes.get(out);
    if (n) n.meta = { ...n.meta, prompt: m.prompt };
    for (const i of m.inputs) edge(i, out, 'edit');
  }

  // Render jobs: each job's inputs feed renders/<id>.mp4; jobs not rendered yet are pending nodes.
  const jdir = path.join(root, 'jobs');
  const jobFiles = [...(fs.existsSync(jdir) ? fs.readdirSync(jdir).filter((f) => f.endsWith('.jsonl')).map((f) => `jobs/${f}`) : []), ...(fs.existsSync(path.join(root, 'jobs.jsonl')) ? ['jobs.jsonl'] : [])];
  for (const jf of jobFiles) {
    for (const j of readJsonl(path.join(root, jf))) {
      if (typeof j?.id !== 'string') continue;
      const out = `renders/${j.id}.mp4`;
      const mode = j.refs?.length || j.ref_audios?.length ? 'Ref2V' : j.first_frame && j.last_frame ? 'FL2V' : j.first_frame ? 'I2V' : 'T2V';
      const existing = nodes.get(out);
      if (existing) existing.meta = { ...existing.meta, prompt: j.prompt, mode: j.guide_audio ? `${mode} + guide audio` : mode, duration: j.seconds };
      else
        nodes.set(out, {
          id: out,
          kind: 'clip',
          lane: 'clips',
          label: `${j.id}.mp4`,
          sub: `${jf} · ${j.seconds ?? 5}s`,
          status: activity.rendering.has(jf) ? 'running' : 'pending',
          meta: { prompt: j.prompt, mode, duration: j.seconds, job: jf },
        });
      edge(j.first_frame, out, 'first frame');
      edge(j.last_frame, out, 'last frame');
      edge(j.guide_audio, out, 'guide audio');
      for (const r of j.refs ?? []) edge(r, out, 'reference');
      for (const r of j.ref_audios ?? []) edge(r, out, 'voice');
      for (const r of j.ref_videos ?? []) edge(r, out, 'reference');
    }
  }

  // The cut: clips -> cut -> final.
  const cut = readJson(path.join(root, 'cut.json'));
  if (cut && Array.isArray(cut.shots)) {
    const shots = cut.shots
      .map((s: any) => ({ src: norm(s?.src ?? s?.clip ?? s?.file), in: Number(s?.in ?? 0), out: Number(s?.out ?? 0), label: String(s?.label ?? '') }))
      .filter((s: any) => s.src);
    let t = 0;
    const timeline = shots.map((s: any) => {
      const len = Math.max(0.1, (s.out || 0) - (s.in || 0)) || 3;
      const poster = nodes.get(s.src)?.media?.poster ?? (nodes.get(s.src)?.media?.type === 'image' ? nodes.get(s.src)?.media?.src : undefined);
      const row = { t: [t, t + len] as [number, number], label: s.label || path.posix.basename(s.src), poster };
      t += len;
      return row;
    });
    nodes.set('cut.json', { id: 'cut.json', kind: 'cut', lane: 'cut', label: 'Cut', sub: `${shots.length} shots · ${t.toFixed(1)} s`, status: 'done', meta: { shots: timeline } });
    for (const s of shots) edge(s.src, 'cut.json', 'shot');
    const out = norm(cut.out);
    if (out) {
      edge('cut.json', out, 'assemble');
      if (!nodes.has(out)) nodes.set(out, { id: out, kind: 'final', lane: 'final', label: path.posix.basename(out), sub: out, status: activity.writing.has(out) ? 'running' : 'pending' });
    }
  }

  // Files a running command is writing right now: show them as loading nodes.
  for (const w of activity.writing) {
    if (nodes.has(w)) {
      const n = nodes.get(w)!;
      n.status = 'running';
      continue;
    }
    const c = classify(w);
    if (c) nodes.set(w, { id: w, kind: c.kind, lane: c.lane, label: path.posix.basename(w), sub: path.posix.dirname(w), status: 'running' });
  }
  for (const n of nodes.values()) if (n.kind === 'clip' && n.status === 'pending' && activity.rendering.has(n.meta?.job)) n.status = 'running';

  // The person's own wiring on the canvas.
  const links = readJson(path.join(root, '.studio/links.json'));
  if (Array.isArray(links)) for (const l of links) edge(l?.from, l?.to, String(l?.role || 'input'), true);

  return { nodes: [...nodes.values()], edges: edges.filter((e) => nodes.has(e.from) && nodes.has(e.to)) };
}

/** Paths a shell command will write, read from the command line (good enough for a loading state). */
export function outputsOf(command: string): { writing: string[]; rendering: string[] } {
  const writing: string[] = [];
  const rendering: string[] = [];
  for (const m of command.matchAll(/--out\s+("[^"]+"|'[^']+'|\S+)/g)) writing.push(m[1].replace(/^["']|["']$/g, ''));
  for (const m of command.matchAll(/(?:^|[\s;&|])(?:\.\/)?bin\/h3\s+("[^"]+"|'[^']+'|\S+\.jsonl)/g)) rendering.push(m[1].replace(/^["']|["']$/g, ''));
  const ff = command.match(/ffmpeg\b[^;&|]*\s(\S+\.(?:mp4|mov|png|jpg|wav))\s*(?:$|[;&|]|2>|>)/);
  if (ff) writing.push(ff[1].replace(/^["']|["']$/g, ''));
  return { writing: writing.map((p) => path.posix.normalize(p.replace(/^\.\//, ''))), rendering: rendering.map((p) => path.posix.normalize(p.replace(/^\.\//, ''))) };
}

