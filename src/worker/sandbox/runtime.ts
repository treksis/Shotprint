import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  MODEL_IDS,
  type DirectorModel,
  type SessionItem,
  type SessionStatus,
  type SessionView,
  type StudioEdge,
  type StudioEvent,
  type StudioProject,
  type TodoEntry,
  type TurnRequest,
  type WorkspaceGraph,
} from '../../shared/studio';
import type { ProjectSession, StudioSandbox } from '../studio/sandbox';
import { connectRelay, containerName, dockerAvailable, ensureContainer, hostRoot, relayRunning, sandboxRoot, seedWorkspace, startRelay } from './docker';
import { outputsOf, scanWorkspace, type Activity } from './graph';
import { MspClient, uuid7 } from './msp';

const SHOWN = new Set(['userMessage', 'agentMessage', 'reasoning', 'toolCall', 'subagent', 'workflow', 'userShell']);
const MAX_OUTPUT = 16_000;
/** Read when checked: module imports run before the dev server loads .env / .dev.vars. */
const usdCap = () => Number(process.env.STUDIO_USD_CAP || 3);
/** List prices per million tokens. */
const PRICE: Record<string, { in: number; out: number }> = {
  'muse-spark-1.3-contributor': { in: 0.1, out: 0.2 },
  'muse-wonder-1.0': { in: 4, out: 20 },
};
const h3Tool = () => path.resolve(process.env.H3_TOOL || 'lab/arena/kit/bin/h3');
const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.m4v': 'video/mp4',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.txt': 'text/plain; charset=utf-8',
};

interface Saved {
  sessionId?: string;
  model?: DirectorModel;
  briefSent?: boolean;
}

function trimItem(raw: any, prev?: SessionItem): SessionItem {
  const out: SessionItem = {
    ...(prev ?? {}),
    id: raw.itemId,
    kind: raw.kind,
    status: raw.status ?? prev?.status ?? 'inProgress',
    turnId: raw.turnId ?? prev?.turnId,
    at: prev?.at ?? Date.now(),
  };
  if (typeof raw.text === 'string') out.text = raw.text;
  if (Array.isArray(raw.summary)) out.summary = raw.summary.map((s: any) => (typeof s === 'string' ? s : s?.text ?? ''));
  if (raw.tool) out.tool = raw.tool;
  // MSP sends tool arguments as a JSON string.
  if (typeof raw.args === 'string') {
    try {
      raw = { ...raw, args: JSON.parse(raw.args) };
    } catch {
      raw = { ...raw, args: { input: raw.args } };
    }
  }
  if (raw.args && typeof raw.args === 'object') {
    // Keep arguments small: file contents are on the canvas, not in the chat.
    const a: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw.args)) a[k] = typeof v === 'string' && v.length > 1200 ? `${v.slice(0, 1200)}…` : v;
    out.args = a;
  }
  if (typeof raw.commandText === 'string') out.commandText = raw.commandText;
  const vis = typeof raw.visibleOutput === 'string' ? raw.visibleOutput : typeof raw.visibleOutput?.text === 'string' ? raw.visibleOutput.text : undefined;
  if (vis !== undefined) out.output = vis.slice(-MAX_OUTPUT);
  if (typeof raw.exitCode === 'number') out.exitCode = raw.exitCode;
  if (typeof raw.durationMs === 'number') out.durationMs = raw.durationMs;
  if (raw.steered) out.steered = true;
  return out;
}

class Runtime implements ProjectSession {
  readonly root: string;
  private status: SessionStatus = 'offline';
  private error?: string;
  private model: DirectorModel = 'spark';
  private saved: Saved;
  private items = new Map<string, SessionItem>();
  private todos: TodoEntry[] = [];
  private llmUsd = 0;
  private mspUsd = 0;
  private estUsd = 0;
  private activeTurnId: string | null = null;
  private queued: SessionView['queued'] = [];
  private graph: WorkspaceGraph = { nodes: [], edges: [] };
  private graphSig = '';
  private listeners = new Set<(e: StudioEvent) => void>();
  private msp?: MspClient;
  private container?: string;
  private sessionId?: string;
  private starting?: Promise<void>;
  private logPos = 0;
  private logBuf = '';
  private timers: NodeJS.Timeout[] = [];
  private scanTimer?: NodeJS.Timeout;
  private bridgeBusy = new Set<string>();
  private rendering = new Set<string>();

  constructor(
    readonly project: StudioProject,
    readonly runnable: boolean
  ) {
    this.root = seedWorkspace(project.id, {
      templateId: project.templateId,
      templateVideo: project.templateId ? path.resolve('public/templates', `${project.templateId}.mp4`) : null,
    });
    this.saved = this.readSaved();
    this.model = this.saved.model ?? 'spark';
    this.tail();
    void this.rescan();
    // Log tail and canvas scan run while anyone is watching; the bridge runs while the sandbox is up.
    this.timers.push(setInterval(() => this.listeners.size && this.tail(), 250));
    this.timers.push(setInterval(() => this.listeners.size && void this.rescan(), 2500));
    this.timers.push(setInterval(() => this.container && this.pollBridge(), 2000));
  }

  // ---- state -------------------------------------------------------------------------------

  private readSaved(): Saved {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.root, '.studio/session.json'), 'utf8'));
    } catch {
      return {};
    }
  }

  private save(patch: Saved) {
    this.saved = { ...this.saved, ...patch };
    fs.mkdirSync(path.join(this.root, '.studio'), { recursive: true });
    fs.writeFileSync(path.join(this.root, '.studio/session.json'), JSON.stringify(this.saved, null, 2));
  }

  private imageUsd() {
    try {
      return fs.readFileSync(path.join(this.root, '.studio/ledger.jsonl'), 'utf8').split('\n').filter((l) => l.includes('"tool":"img"')).length * 0.01;
    } catch {
      return 0;
    }
  }

  private usd() {
    return Math.round((this.llmUsd + this.imageUsd()) * 10000) / 10000;
  }

  view(): SessionView {
    return {
      status: this.status === 'offline' && this.activeTurnId ? 'running' : this.status,
      error: this.error,
      runnable: this.runnable,
      model: this.model,
      activeTurnId: this.activeTurnId,
      queued: this.queued,
      items: [...this.items.values()],
      todos: this.todos,
      usd: this.usd(),
      graph: this.graph,
    };
  }

  subscribe(fn: (e: StudioEvent) => void) {
    this.tail();
    this.listeners.add(fn);
    fn({ type: 'snapshot', view: this.view() });
    // Reattach to a session that is still running in the sandbox (e.g. after a server restart).
    if (this.runnable && this.saved.sessionId && !this.msp) void this.ensureStarted().catch(() => undefined);
    return () => this.listeners.delete(fn);
  }

  private emit(e: StudioEvent) {
    for (const l of this.listeners) l(e);
  }

  private setStatus(status: SessionStatus, error?: string) {
    this.status = status;
    this.error = error;
    this.emit({ type: 'status', status: this.view().status, activeTurnId: this.activeTurnId, queued: this.queued, error, model: this.model });
  }

  // ---- event log (written by the relay inside the sandbox) ---------------------------------

  private tail() {
    const file = path.join(this.root, '.studio/events.jsonl');
    let fd: number;
    try {
      fd = fs.openSync(file, 'r');
    } catch {
      return;
    }
    try {
      const size = fs.fstatSync(fd).size;
      if (size < this.logPos) this.logPos = 0;
      if (size === this.logPos) return;
      const buf = Buffer.alloc(size - this.logPos);
      fs.readSync(fd, buf, 0, buf.length, this.logPos);
      this.logPos = size;
      this.logBuf += buf.toString('utf8');
      let i;
      while ((i = this.logBuf.indexOf('\n')) >= 0) {
        const line = this.logBuf.slice(0, i);
        this.logBuf = this.logBuf.slice(i + 1);
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line);
          this.fold(ev.method, ev.params ?? {}, ev.t);
        } catch {
          /* a torn line: skip */
        }
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  private fold(method: string, p: any, t?: number) {
    if (method === 'item/started' || method === 'item/updated' || method === 'item/completed') {
      const raw = p.item;
      if (!raw?.itemId || !SHOWN.has(raw.kind)) return;
      const item = trimItem(raw, this.items.get(raw.itemId));
      if (!this.items.has(raw.itemId) && t) item.at = t;
      this.items.set(item.id, item);
      this.emit({ type: 'item', item });
      if (method === 'item/completed' && item.kind === 'toolCall') this.scheduleScan(150);
      if (method !== 'item/completed' && item.kind === 'toolCall') this.scheduleScan(50);
    } else if (method === 'item/delta') {
      const it = this.items.get(p.itemId);
      if (!it) return;
      const field = String(p.field ?? 'text');
      const d = String(p.delta ?? '');
      if (field === 'text') it.text = (it.text ?? '') + d;
      else if (field.startsWith('summary.')) {
        const k = Number(field.split('.')[1]) || 0;
        it.summary = [...(it.summary ?? [])];
        it.summary[k] = (it.summary[k] ?? '') + d;
      } else if (field === 'output') it.output = ((it.output ?? '') + d).slice(-MAX_OUTPUT);
      else return;
      this.emit({ type: 'delta', id: it.id, field, delta: d });
    } else if (method === 'turn/started') {
      this.activeTurnId = p.turnId;
      this.queued = this.queued.filter((q) => q.turnId !== p.turnId);
      this.setStatus('running');
    } else if (method === 'turn/completed') {
      if (this.activeTurnId === p.turnId || !p.turnId) this.activeTurnId = null;
      if (p.terminal === 'failed' && p.error?.message) {
        const item: SessionItem = { id: `err-${p.turnId ?? Date.now()}`, kind: 'error', status: 'failed', turnId: p.turnId, text: p.error.message, at: t ?? Date.now() };
        this.items.set(item.id, item);
        this.emit({ type: 'item', item });
      }
      if (p.terminal === 'cancelled') {
        const item: SessionItem = { id: `stop-${p.turnId ?? Date.now()}`, kind: 'notice', status: 'completed', turnId: p.turnId, text: 'Stopped.', at: t ?? Date.now() };
        this.items.set(item.id, item);
        this.emit({ type: 'item', item });
      }
      // A cancelled turn can leave items "in progress" forever: close them.
      for (const it of this.items.values())
        if (it.turnId === p.turnId && it.status === 'inProgress') {
          it.status = p.terminal === 'completed' ? 'completed' : 'cancelled';
          this.emit({ type: 'item', item: it });
        }
      this.setStatus(this.msp ? (this.activeTurnId ? 'running' : 'idle') : 'offline');
      this.scheduleScan(100);
    } else if (method === 'turn/unqueued') {
      this.queued = this.queued.filter((q) => q.turnId !== p.turnId);
      this.setStatus(this.status);
    } else if (method === 'session/tokenUsage') {
      // Muse Code prices some models itself (cumulative.cost); for the rest (Muse Wonder) we price each
      // call's tokens from the list price, cached prompt tokens at the full rate so the cap errs safe.
      const priced = p.cumulative?.cost?.usd;
      if (typeof priced === 'number' && !p.cumulative?.cost?.partial) this.mspUsd = priced;
      else if (p.usage) {
        const price = PRICE[p.modelId] ?? PRICE['muse-wonder-1.0'];
        this.estUsd += ((p.usage.inputTokens ?? 0) * price.in + (p.usage.outputTokens ?? 0) * price.out) / 1e6;
      }
      this.llmUsd = Math.max(this.mspUsd, this.estUsd);
      this.emit({ type: 'usage', usd: this.usd() });
      if (this.usd() > usdCap() && this.activeTurnId) void this.interrupt();
    } else if (method === 'session/todoListChanged') {
      this.todos = (p.items ?? []).map((x: any) => ({ text: x.text, status: x.status, activeForm: x.activeForm }));
      this.emit({ type: 'todos', items: this.todos });
    }
  }

  // ---- canvas --------------------------------------------------------------------------------

  private activity(): Activity {
    const writing = new Set<string>();
    const rendering = new Set(this.rendering);
    const rel = (p: string) => (p.startsWith(sandboxRoot(this.project.id)) ? path.posix.relative(sandboxRoot(this.project.id), p) : p.replace(/^\.\//, ''));
    for (const it of this.items.values()) {
      if (it.kind !== 'toolCall' || it.status !== 'inProgress') continue;
      const cmd = it.commandText ?? (typeof it.args?.command === 'string' ? it.args.command : '');
      if (cmd) {
        const o = outputsOf(cmd);
        o.writing.forEach((w) => writing.add(rel(w)));
        o.rendering.forEach((r) => rendering.add(rel(r)));
      }
      if (typeof it.args?.path === 'string' && /write|edit|create/i.test(it.tool ?? '')) writing.add(rel(it.args.path));
    }
    return { writing, rendering };
  }

  private scheduleScan(ms: number) {
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = setTimeout(() => void this.rescan(), ms);
  }

  private scanning = false;
  private async rescan() {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const g = await scanWorkspace(this.root, this.project.id, this.activity());
      const sig = JSON.stringify(g);
      if (sig !== this.graphSig) {
        this.graphSig = sig;
        this.graph = g;
        this.emit({ type: 'graph', graph: g });
      }
    } catch (e) {
      console.warn('[studio] scan failed', (e as Error).message);
    } finally {
      this.scanning = false;
    }
  }

  // ---- Muse Code session ---------------------------------------------------------------------

  private ensureStarted(): Promise<void> {
    if (this.msp && !this.msp.closed && this.sessionId) return Promise.resolve();
    if (!this.runnable) return Promise.reject(new Error('This server has no sandbox runtime.'));
    this.starting ??= (async () => {
      this.setStatus('starting');
      try {
        this.container = await ensureContainer(this.project.id);
        // A running relay already holds the session on its one MSP connection: reattach without
        // session/resume, which Muse Code treats as crash recovery and cancels the running turn.
        const warm = await relayRunning(this.container);
        if (!warm) await startRelay(this.project.id, this.container, MODEL_IDS[this.model]);
        const proc = connectRelay(this.container);
        const msp = new MspClient(proc);
        proc.on('exit', () => {
          if (this.msp === msp) {
            this.msp = undefined;
            this.setStatus('offline');
          }
        });
        await msp.request('initialize', { clientInfo: { name: 'museclone_studio', title: 'MuseClone Studio', version: '0.2.0' }, capabilities: { experimentalApi: true } });
        msp.notify('initialized');
        let session: any;
        if (warm && this.saved.sessionId) session = { sessionId: this.saved.sessionId, activeTurnId: this.activeTurnId, status: this.activeTurnId ? 'running' : 'idle' };
        else if (this.saved.sessionId) {
          try {
            session = (await msp.request('session/resume', { commandId: uuid7(), sessionId: this.saved.sessionId, excludeItems: true })).session;
          } catch (e) {
            console.warn('[studio] resume failed, starting a new session:', (e as Error).message);
          }
        }
        session ??= (
          await msp.request('session/start', {
            commandId: uuid7(),
            workspaceRoot: sandboxRoot(this.project.id),
            approvalMode: 'allowAll',
            modelId: MODEL_IDS[this.model],
          })
        ).session;
        this.sessionId = session.sessionId ?? session.id;
        this.save({ sessionId: this.sessionId, model: this.model });
        this.msp = msp;
        this.activeTurnId = session.activeTurnId ?? this.activeTurnId;
        this.setStatus(session.status === 'running' || this.activeTurnId ? 'running' : 'idle');
      } catch (e) {
        this.setStatus('error', (e as Error).message);
        throw e;
      } finally {
        this.starting = undefined;
      }
    })();
    return this.starting;
  }

  async setModel(model: DirectorModel) {
    this.model = model;
    this.save({ model });
    if (this.msp && this.sessionId) await this.msp.request('session/setModel', { commandId: uuid7(), sessionId: this.sessionId, model: { modelId: MODEL_IDS[model], providerId: 'meta' } });
    this.setStatus(this.status, this.error);
  }

  async turn(req: TurnRequest) {
    if (this.usd() > usdCap()) throw new Error(`This project reached its $${usdCap()} spend cap.`);
    await this.ensureStarted();
    if (req.model && req.model !== this.model) await this.setModel(req.model);
    const files = (req.files ?? []).filter(Boolean);
    const text = files.length ? `${req.text}\n\nAttached: ${files.map((f) => `\`${f}\``).join(', ')}` : req.text;
    const input = [{ type: 'text', text }];
    if (req.mode === 'steer' && this.activeTurnId) {
      try {
        await this.msp!.request('turn/steer', { commandId: uuid7(), sessionId: this.sessionId, expectedTurnId: this.activeTurnId, input });
        return { disposition: 'steered' };
      } catch {
        /* the turn just ended: fall through and start or queue it */
      }
    }
    const r = await this.msp!.request('turn/start', { commandId: uuid7(), sessionId: this.sessionId, input, ifBusy: 'queue', displayText: req.text });
    if (r.disposition === 'queued') {
      this.queued = [...this.queued, { turnId: r.turnId, text: req.text }];
      this.setStatus(this.status);
    } else if (r.disposition === 'started') {
      this.activeTurnId = r.turnId;
      this.setStatus('running');
    }
    return { disposition: r.disposition as string };
  }

  async start() {
    if (this.saved.briefSent || this.items.size || !this.project.prompt.trim()) return { started: false };
    this.save({ briefSent: true });
    const t = this.project.templateId;
    const hint = t && fs.existsSync(path.join(this.root, 'templates', t))
      ? `\n\n(Template picked: \`templates/${t}/\`.)`
      : t && fs.existsSync(path.join(this.root, 'inputs/reference.mp4'))
        ? '\n\n(Reference film: `inputs/reference.mp4`. It has not been dissected into a template yet.)'
        : '';
    await this.turn({ text: `${this.project.prompt}${hint}` });
    return { started: true };
  }

  async interrupt() {
    if (!this.msp || !this.sessionId) return;
    await this.msp.request('turn/interrupt', { commandId: uuid7(), sessionId: this.sessionId, ...(this.activeTurnId ? { turnId: this.activeTurnId } : {}) });
  }

  async unqueue(turnId: string) {
    if (!this.msp || !this.sessionId) return;
    await this.msp.request('turn/unqueue', { commandId: uuid7(), sessionId: this.sessionId, turnId });
    this.queued = this.queued.filter((q) => q.turnId !== turnId);
    this.setStatus(this.status);
  }

  // ---- files ---------------------------------------------------------------------------------

  private resolve(rel: string): string | null {
    const p = path.resolve(this.root, rel);
    return p.startsWith(this.root + path.sep) ? p : null;
  }

  async serveFile(rel: string, range?: string | null): Promise<Response> {
    const p = this.resolve(rel);
    if (!p || /(^|\/)\.(?!studio\/thumbs\/)/.test(rel) || !fs.existsSync(p) || !fs.statSync(p).isFile()) return new Response('not found', { status: 404 });
    const size = fs.statSync(p).size;
    const type = MIME[path.extname(p).toLowerCase()] ?? 'application/octet-stream';
    const m = range?.match(/bytes=(\d*)-(\d*)/);
    if (m) {
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      return new Response(Readable.toWeb(fs.createReadStream(p, { start, end })) as any, {
        status: 206,
        headers: { 'content-type': type, 'content-length': String(end - start + 1), 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' },
      });
    }
    return new Response(Readable.toWeb(fs.createReadStream(p)) as any, {
      headers: { 'content-type': type, 'content-length': String(size), 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600' },
    });
  }

  async upload(name: string, data: ArrayBuffer) {
    const safe = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'upload';
    let rel = `inputs/${safe}`;
    for (let i = 2; fs.existsSync(path.join(this.root, rel)); i++) rel = `inputs/${safe.replace(/(\.[^.]*)?$/, `_${i}$1`)}`;
    fs.mkdirSync(path.join(this.root, 'inputs'), { recursive: true });
    fs.writeFileSync(path.join(this.root, rel), Buffer.from(data));
    await this.rescan();
    return rel;
  }

  async setLinks(links: StudioEdge[]) {
    const clean = links.filter((l) => l.from && l.to).map((l) => ({ from: l.from, to: l.to, role: l.role || 'input' }));
    fs.mkdirSync(path.join(this.root, '.studio'), { recursive: true });
    fs.writeFileSync(path.join(this.root, '.studio/links.json'), JSON.stringify(clean, null, 2));
    await this.rescan();
  }

  // ---- bin/h3 bridge: renders run on the host, which holds the GPU connection ------------------

  private pollBridge() {
    const req = path.join(this.root, '.bridge/req');
    const out = path.join(this.root, '.bridge/out');
    let files: string[];
    try {
      files = fs.readdirSync(req).filter((f) => f.endsWith('.json'));
    } catch {
      return;
    }
    for (const f of files) {
      const rid = f.slice(0, -5);
      if (this.bridgeBusy.has(rid) || fs.existsSync(path.join(out, `${rid}.started`)) || fs.existsSync(path.join(out, `${rid}.exit`))) continue;
      this.bridgeBusy.add(rid);
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, `${rid}.started`), '');
      let r: { tool: string; args: string[]; cwd?: string };
      try {
        r = JSON.parse(fs.readFileSync(path.join(req, f), 'utf8'));
      } catch {
        fs.writeFileSync(path.join(out, `${rid}.exit`), '2');
        continue;
      }
      const log = path.join(out, `${rid}.log`);
      const finish = (code: number) => {
        fs.writeFileSync(path.join(out, `${rid}.exit`), String(code));
        this.bridgeBusy.delete(rid);
        if (jobs) this.rendering.delete(jobs);
        this.scheduleScan(100);
      };
      const jobs = r.args[0]?.endsWith('.jsonl') ? r.args[0] : null;
      if (r.tool !== 'h3') {
        fs.writeFileSync(log, `bridge: unknown tool ${r.tool}\n`);
        finish(2);
        continue;
      }
      // The GPU box is opt-in: ssh to a Colab session that isn't running would start a billed one.
      if (process.env.H3_ENABLED !== '1' || !fs.existsSync(h3Tool())) {
        fs.writeFileSync(log, 'h3: the video renderer is offline right now (the GPU is switched off).\nKeep going with plans and stills; the jobs file is saved and can be rendered later.\n');
        finish(69);
        continue;
      }
      if (jobs) this.rendering.add(jobs);
      this.scheduleScan(50);
      const fd = fs.openSync(log, 'w');
      const p = spawn('python3', [h3Tool(), ...r.args], {
        cwd: this.root,
        stdio: ['ignore', fd, fd],
        env: { ...process.env, ARM_ROOT: this.root, PYTHONUNBUFFERED: '1' },
      });
      p.on('exit', (code) => {
        fs.closeSync(fd);
        finish(code ?? 1);
      });
    }
  }

  dispose() {
    this.timers.forEach(clearInterval);
    this.msp?.close();
  }
}

const runtimes = new Map<string, Runtime>();

/** Dev sandbox: one Docker container per project running Muse Code, workspaces under .data/workspaces. */
export const dockerSandbox: StudioSandbox = {
  runnable: () => dockerAvailable(),
  async open(project) {
    let r = runtimes.get(project.id);
    if (!r) {
      r = new Runtime(project, await dockerAvailable());
      runtimes.set(project.id, r);
    }
    return r;
  },
  async remove(projectId) {
    runtimes.get(projectId)?.dispose();
    runtimes.delete(projectId);
    await new Promise((res) => spawn('docker', ['rm', '-f', containerName(projectId)], { stdio: 'ignore' }).on('exit', res));
    fs.rmSync(hostRoot(projectId), { recursive: true, force: true });
  },
};
