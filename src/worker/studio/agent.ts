import type { WorkerBindings } from '../index';
import { getAsset, putAsset } from '../assets';

/**
 * The director: a Muse tool-calling loop. Each turn sends the chat, a canvas summary and the tools;
 * tool calls run here (image generation, notes, connections) and stream to the client as events,
 * and the client applies them to the canvas (which persists). Spend is capped per browser session.
 */

export type DirectorModel = 'spark' | 'wonder';
const MODEL_ID: Record<DirectorModel, string> = { spark: 'muse-spark-1.3-contributor', wonder: 'muse-wonder-1.0' };
const PRICE: Record<DirectorModel, { in: number; out: number }> = { spark: { in: 0.1, out: 0.2 }, wonder: { in: 4, out: 20 } };
const IMAGE_MODEL = 'muse-image-1.0';
const IMAGE_USD = 0.01;
const MAX_STEPS = 8;

export interface CanvasNodeSummary {
  id: string;
  kind: string;
  label: string;
  sub?: string;
  media?: { type: string; src: string };
}

export interface AgentRequest {
  model: DirectorModel;
  text: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  canvas: { nodes: CanvasNodeSummary[]; edges: Array<{ from: string; to: string; role: string }> };
  template: { id: string; title: string; status: string } | null;
}

export type AgentEvent =
  | { type: 'step'; id: string; text: string; status: 'running' | 'done' | 'failed'; cost?: string }
  | { type: 'node'; node: any; edges?: Array<{ from: string; to: string; role: string }> }
  | { type: 'edge'; edge: { from: string; to: string; role: string } }
  | { type: 'text'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'run'; id: string }
  | { type: 'steer'; text: string }
  | { type: 'stopped' }
  | { type: 'done'; usd: number; model: string }
  | { type: 'error'; message: string };

// ---------- per-session budget (in-isolate memory; fine for a hackathon) ----------
interface Spend {
  turns: number;
  images: number;
  usd: number;
}
const spend = new Map<string, Spend>();
export const LIMITS = {
  demo: { turns: 30, images: 8, usd: 0.5, models: ['spark'] as DirectorModel[] },
  live: { turns: 200, images: 80, usd: 10, models: ['spark', 'wonder'] as DirectorModel[] },
};
export function budgetFor(session: string) {
  if (!spend.has(session)) spend.set(session, { turns: 0, images: 0, usd: 0 });
  return spend.get(session)!;
}

// ---------- tools ----------
const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_canvas',
      description: 'List the nodes and connections currently on the canvas.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description:
        'Generate a still image (a keyframe, plate, storyboard frame, character or product shot) and place it on the canvas. Pass reference_node_ids to edit or composite existing canvas images (people, products, sets) instead of inventing them.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Concrete visual description: subject, framing, lens, light, setting. No text in the image.' },
          label: { type: 'string', description: 'Short node title, e.g. "CAM-A plate" or "Opening keyframe".' },
          aspect: { type: 'string', enum: ['16:9', '9:16', '1:1'] },
          reference_node_ids: { type: 'array', items: { type: 'string' }, description: 'Canvas node ids whose images to use as references.' },
        },
        required: ['prompt', 'label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_note',
      description: 'Add a text note to the canvas: a shot list, script, line, plan or decision.',
      parameters: {
        type: 'object',
        properties: { label: { type: 'string' }, text: { type: 'string' } },
        required: ['label', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connect',
      description: 'Connect two canvas nodes to record that one was made from or feeds the other.',
      parameters: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' }, role: { type: 'string', description: 'e.g. "reference", "first frame", "input"' } },
        required: ['from', 'to', 'role'],
      },
    },
  },
];

/** Responses API tool shape: name/description/parameters at the top level. */
const TOOLS = CHAT_TOOLS.map((x) => ({ type: 'function', ...x.function }));

function systemPrompt(req: AgentRequest) {
  const nodes = req.canvas.nodes
    .slice(0, 80)
    .map((n) => `- ${n.id} · ${n.kind} · "${n.label}"${n.sub ? ` (${n.sub})` : ''}${n.media ? ` [${n.media.type}]` : ''}`)
    .join('\n');
  return `You are the Director in MuseClone Studio, a general, agent-native video engine. You turn a brief into a film by working on a shared canvas of nodes: references, templates (real films dissected into shots, camera setups and lines), plates and keyframes, voice takes, shots, the cut and the final film.

What you can do right now, with tools: generate still images (keyframes, plates, storyboard frames, character and product shots) with Muse Image, using canvas images as references; add notes (shot lists, scripts, lines); connect nodes; read the canvas. Rendering video shots (MiniMax-H3: reference, first + last frame, guide audio) and assembling the cut are being connected next: say so plainly when asked, never claim you rendered video.

How you work: act, don't just describe. When the user wants visuals, call generate_image. Keep identity consistent by passing the relevant canvas images as reference_node_ids. Write prompts like a cinematographer (subject, framing, lens, light, setting), never ask for readable text in images. Keep replies short: what you did, what's next, one question at most. Refer to nodes by their label.

${req.template ? `Project template: "${req.template.title}" (${req.template.status}).\n` : ''}Canvas (${req.canvas.nodes.length} nodes, ${req.canvas.edges.length} connections):
${nodes || '(empty)'}`;
}

/**
 * One streamed Muse call on the Responses API. Reasoning summaries ("thinking") and text arrive as
 * deltas; function calls are collected when their output item completes. Stateless: the caller sends
 * the whole turn transcript every time (Muse's stored responses expired mid-turn when chained with
 * previous_response_id, measured 2026-10-30).
 */
async function callMuse(
  env: WorkerBindings,
  model: DirectorModel,
  instructions: string,
  input: any[],
  on: { text: (s: string) => void; thinking: (s: string) => void },
  signal: AbortSignal
) {
  const res = await fetch(`${env.META_API_BASE_URL || 'https://api.meta.ai/v1'}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.META_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_ID[model],
      instructions,
      input,
      tools: TOOLS,
      parallel_tool_calls: true,
      reasoning: { effort: 'medium', summary: 'auto' },
      max_output_tokens: 4000,
      store: false,
      stream: true,
    }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Muse ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let id: string | null = null;
  let content = '';
  let usage: any = null;
  const calls: Array<{ call_id: string; name: string; arguments: string }> = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      let ev: any;
      try {
        ev = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (ev.type === 'response.created') id = ev.response?.id ?? id;
      else if (ev.type === 'response.output_text.delta') {
        content += ev.delta;
        on.text(ev.delta);
      } else if (ev.type === 'response.reasoning_summary_text.delta') on.thinking(ev.delta);
      else if (ev.type === 'response.reasoning_summary_part.done') on.thinking('\n\n');
      else if (ev.type === 'response.output_item.done' && ev.item?.type === 'function_call')
        calls.push({ call_id: ev.item.call_id, name: ev.item.name, arguments: ev.item.arguments ?? '{}' });
      else if (ev.type === 'response.completed') {
        usage = ev.response?.usage;
        id = ev.response?.id ?? id;
      } else if (ev.type === 'response.failed' || ev.type === 'error') throw new Error(ev.response?.error?.message || ev.message || 'Muse response failed');
    }
  }
  const u = usage ?? {};
  const usd = ((u.input_tokens ?? 0) * PRICE[model].in + (u.output_tokens ?? 0) * PRICE[model].out) / 1e6;
  return { id, content, calls, usd };
}

// ---------- runs: steering and stop ----------
interface RunControl {
  steer: string[];
  aborted: AbortController;
}
const runs = new Map<string, RunControl>();
export const steerRun = (id: string, text: string) => {
  const r = runs.get(id);
  if (!r) return false;
  r.steer.push(text);
  return true;
};
export const stopRun = (id: string) => {
  const r = runs.get(id);
  if (!r) return false;
  r.aborted.abort();
  return true;
};

async function toDataUrl(env: WorkerBindings, src: string, origin: string): Promise<string | null> {
  try {
    const m = src.match(/^\/api\/assets\/(.+)$/);
    let buf: ArrayBuffer;
    let type: string;
    if (m) {
      const a = await getAsset(env, decodeURIComponent(m[1]));
      if (!a) return null;
      buf = a.buffer;
      type = a.contentType;
    } else {
      const r = await fetch(new URL(src, origin));
      if (!r.ok) return null;
      buf = await r.arrayBuffer();
      type = r.headers.get('content-type') || 'image/jpeg';
    }
    if (!type.startsWith('image/')) return null;
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

async function generateImage(env: WorkerBindings, args: any, req: AgentRequest, origin: string) {
  const refs = (args.reference_node_ids ?? [])
    .map((id: string) => req.canvas.nodes.find((n) => n.id === id))
    .filter((n: CanvasNodeSummary | undefined): n is CanvasNodeSummary => !!n?.media && n.media.type === 'image');
  const images = (await Promise.all(refs.map((n: CanvasNodeSummary) => toDataUrl(env, n.media!.src, origin)))).filter(Boolean) as string[];
  const aspect = args.aspect === '9:16' ? 'Vertical 9:16 composition. ' : args.aspect === '1:1' ? 'Square composition. ' : 'Wide 16:9 composition. ';
  const prompt = `${aspect}${args.prompt}`;
  const res = await fetch(`${env.META_API_BASE_URL || 'https://api.meta.ai/v1'}/images/${images.length ? 'edits' : 'generations'}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.META_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(images.length ? { model: IMAGE_MODEL, prompt, images: images.map((u) => ({ image_url: u })) } : { model: IMAGE_MODEL, prompt }),
  });
  if (!res.ok) throw new Error(`Muse Image ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('Muse Image returned no image');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stored = await putAsset(env, `${String(args.label || 'image').slice(0, 40)}.webp`, bytes.buffer, 'image/webp');
  return { url: stored.url, refs: refs.map((r: CanvasNodeSummary) => r.id) };
}

let nodeCounter = 0;
const nodeId = (p: string) => `${p}_${Date.now().toString(36)}${(nodeCounter++).toString(36)}`;

/** Run one tool call; returns what goes back to the model and what it cost. */
async function runTool(
  env: WorkerBindings,
  name: string,
  args: any,
  stepId: string,
  req: AgentRequest,
  canvas: { nodes: CanvasNodeSummary[]; edges: Array<{ from: string; to: string; role: string }> },
  b: Spend,
  limits: (typeof LIMITS)['demo'],
  live: boolean,
  origin: string,
  emit: (e: AgentEvent) => void
): Promise<{ result: any; usd: number }> {
  try {
    if (name === 'list_canvas') {
      emit({ type: 'step', id: stepId, text: 'Looking at the canvas', status: 'done' });
      return { result: canvas, usd: 0 };
    }
    if (name === 'generate_image') {
      if (b.images >= limits.images) throw new Error(`image budget used (${limits.images} per session${live ? '' : ' in demo mode'})`);
      const label = String(args.label || 'Image').slice(0, 60);
      const id = nodeId('img');
      emit({ type: 'step', id: stepId, text: `Generating "${label}" with Muse Image`, status: 'running', cost: '1 image' });
      emit({ type: 'node', node: { id, kind: 'image', lane: 'plates', label, sub: 'Muse Image', status: 'running', meta: { prompt: args.prompt } } });
      const img = await generateImage(env, args, { ...req, canvas }, origin);
      b.images++;
      b.usd += IMAGE_USD;
      const node = {
        id,
        kind: 'image',
        lane: 'plates',
        label,
        sub: img.refs.length ? `Muse Image · edit of ${img.refs.length} reference${img.refs.length > 1 ? 's' : ''}` : 'Muse Image',
        status: 'done',
        media: { type: 'image', src: img.url },
        meta: { prompt: args.prompt, mode: img.refs.length ? 'image edit' : 'text to image', aspect: args.aspect ?? '16:9' },
      };
      const edges = img.refs.map((r: string) => ({ from: r, to: id, role: 'reference' }));
      canvas.nodes.push({ id, kind: 'image', label, media: { type: 'image', src: img.url } });
      canvas.edges.push(...edges);
      emit({ type: 'node', node, edges });
      emit({ type: 'step', id: stepId, text: `Generated "${label}"`, status: 'done', cost: '1 image' });
      return { result: { node_id: id, label, used_references: img.refs }, usd: IMAGE_USD };
    }
    if (name === 'add_note') {
      const id = nodeId('note');
      const node = { id, kind: 'note', lane: 'notes', label: String(args.label || 'Note').slice(0, 60), text: String(args.text || ''), status: 'done' };
      canvas.nodes.push({ id, kind: 'note', label: node.label });
      emit({ type: 'node', node });
      emit({ type: 'step', id: stepId, text: `Added note "${node.label}"`, status: 'done' });
      return { result: { node_id: id }, usd: 0 };
    }
    if (name === 'connect') {
      const label = (id: string) => canvas.nodes.find((n) => n.id === id)?.label;
      if (!label(args.from) || !label(args.to)) throw new Error('unknown node id');
      const edge = { from: args.from, to: args.to, role: String(args.role || 'input') };
      canvas.edges.push(edge);
      emit({ type: 'edge', edge });
      emit({ type: 'step', id: stepId, text: `Connected "${label(args.from)}" → "${label(args.to)}" (${edge.role})`, status: 'done' });
      return { result: { ok: true }, usd: 0 };
    }
    throw new Error(`unknown tool ${name}`);
  } catch (e) {
    const msg = (e as Error).message;
    emit({ type: 'step', id: stepId, text: `${name} failed: ${msg}`, status: 'failed' });
    return { result: { error: msg }, usd: 0 };
  }
}

/** Run one director turn, emitting events as it goes. */
export async function runDirector(
  env: WorkerBindings,
  req: AgentRequest,
  session: string,
  live: boolean,
  origin: string,
  emit: (e: AgentEvent) => void,
  onClientAbort: (fn: () => void) => void = () => undefined
) {
  const limits = live ? LIMITS.live : LIMITS.demo;
  const b = budgetFor(session);
  const model: DirectorModel = limits.models.includes(req.model) ? req.model : 'spark';
  if (b.turns >= limits.turns || b.usd >= limits.usd) {
    emit({ type: 'error', message: `This session has used its ${live ? 'live' : 'demo'} budget (${b.turns} turns, $${b.usd.toFixed(2)}).${live ? '' : ' Enter the judge passcode for a larger budget.'}` });
    return;
  }
  if (!env.META_API_KEY) {
    emit({ type: 'error', message: 'The Muse API key is not configured on this server.' });
    return;
  }
  b.turns++;
  const runId = `run_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const ctl: RunControl = { steer: [], aborted: new AbortController() };
  runs.set(runId, ctl);
  onClientAbort(() => ctl.aborted.abort());
  emit({ type: 'run', id: runId });
  const canvas = { nodes: [...req.canvas.nodes], edges: [...req.canvas.edges] };
  const instructions = systemPrompt(req);
  let input: any[] = [...req.history.slice(-12).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: req.text }];
  let usd = 0;
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      if (ctl.aborted.signal.aborted) break;
      // Mid-turn steering: anything the user sent while the director worked goes in before the next step.
      for (const s of ctl.steer.splice(0)) {
        input.push({ role: 'user', content: `(The user adds, while you are working:) ${s}` });
        emit({ type: 'steer', text: s });
      }
      const thinkId = `think_${step}`;
      emit({ type: 'step', id: thinkId, text: step === 0 ? 'Reading the brief and the canvas' : 'Deciding the next step', status: 'running' });
      let streamed = false;
      const r = await callMuse(
        env,
        model,
        instructions,
        input,
        {
          text: (d) => {
            if (!streamed && step > 0) emit({ type: 'delta', text: '\n\n' });
            streamed = true;
            emit({ type: 'delta', text: d });
          },
          thinking: (d) => emit({ type: 'thinking', text: d }),
        },
        ctl.aborted.signal
      );
      // Keep the model's own output in the transcript: its text and its function calls.
      if (r.content) input.push({ role: 'assistant', content: r.content });
      for (const c of r.calls) input.push({ type: 'function_call', call_id: c.call_id, name: c.name, arguments: c.arguments });
      usd += r.usd;
      b.usd += r.usd;
      emit({ type: 'step', id: thinkId, text: step === 0 ? 'Read the brief and the canvas' : 'Decided the next step', status: 'done' });
      if (!r.calls.length) {
        // A steering message that arrived during the answer gets its own follow-up step.
        if (ctl.steer.length && step < MAX_STEPS - 1) continue;
        if (!r.content) emit({ type: 'text', text: 'Done.' });
        break;
      }
      for (const call of r.calls) {
        if (ctl.aborted.signal.aborted) break;
        let args: any = {};
        try {
          args = JSON.parse(call.arguments || '{}');
        } catch {
          /* bad JSON from the model; the tool reports it */
        }
        const out = await runTool(env, call.name, args, call.call_id, req, canvas, b, limits, live, origin, emit);
        usd += out.usd;
        input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(out.result).slice(0, 4000) });
      }
      if (step === MAX_STEPS - 1) emit({ type: 'text', text: 'I stopped after the maximum number of steps for one turn. Tell me how to continue.' });
    }
  } catch (e) {
    if (!ctl.aborted.signal.aborted) throw e;
  } finally {
    runs.delete(runId);
  }
  if (ctl.aborted.signal.aborted) emit({ type: 'stopped' });
  emit({ type: 'done', usd: Number(usd.toFixed(4)), model: MODEL_ID[model] });
}
