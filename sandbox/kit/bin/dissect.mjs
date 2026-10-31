#!/usr/bin/env node
// Measure a video for dissection in seconds, with no model calls (except an optional transcript).
//   bin/dissect inputs/film.mp4 [--template <name>] [--threshold 0.3] [--min-shot 0.4] [--no-transcribe]
// Writes:
//   dissection/<stem>_shots_NN.jpg    shot boards: start / middle / end of every shot, labelled (read these)
//   dissection/<stem>_contact_NN.jpg  1 fps contact sheets with timecodes (for checking a moment)
//   dissection/<stem>.json            shots (times, transition, loudness, speech), soft cuts, silences, black
//   dissection/<stem>.md              the same as a readable table
//   dissection/frames/<stem>_sNN.jpg  a 1280 px middle frame per shot
// With --template <name>: templates/<name>/template.json pre-filled with the measured fields of every
// shot, and the frames copied to templates/<name>/frames/shotNN.jpg. Describe the rest by looking.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const a = process.argv.slice(2);
const opt = { threshold: 0.3, minShot: 0.4, transcribe: true, template: null };
let video;
for (let i = 0; i < a.length; i++) {
  if (a[i] === "--template") opt.template = a[++i];
  else if (a[i] === "--threshold") opt.threshold = Number(a[++i]);
  else if (a[i] === "--min-shot") opt.minShot = Number(a[++i]);
  else if (a[i] === "--no-transcribe") opt.transcribe = false;
  else if (!video) video = a[i];
}
if (!video || !fs.existsSync(video)) {
  console.error("usage: bin/dissect <video> [--template <name>] [--threshold 0.3] [--min-shot 0.4] [--no-transcribe]");
  process.exit(2);
}

const T0 = Date.now();
const timings = {};
// The stem goes into ffmpeg filter arguments and image patterns, so keep it to safe characters.
const stem = path.basename(video).replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9._-]+/g, "_");
const OUT = "dissection";
const WORK = path.join(".studio/dissect", stem);
const FRAMES = path.join(OUT, "frames");
for (const d of [OUT, WORK, FRAMES]) fs.mkdirSync(d, { recursive: true });
// A rerun replaces every picture this tool made for the video, so none are left from the last run.
for (const [dir, re] of [[OUT, new RegExp(`^${stem}_(shots|contact)_\\d+\\.jpg$`)], [FRAMES, new RegExp(`^${stem}_s\\d+\\.jpg$`)]])
  for (const f of fs.readdirSync(dir)) if (re.test(f)) fs.rmSync(path.join(dir, f));
const FONT = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"].find((f) => fs.existsSync(f));
const fontArg = FONT ? `fontfile=${FONT}:` : "";
const TILE_W = 384;
// Docker limits the container's CPUs without changing what os.cpus() reports.
const cores = (() => {
  try {
    const [quota, period] = fs.readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim().split(/\s+/);
    if (quota !== "max") return Math.max(1, Math.floor(Number(quota) / Number(period)));
  } catch {}
  return Math.max(1, os.cpus().length);
})();

function run(cmd, args, { label } = {}) {
  const t = Date.now();
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      if (label) timings[label] = +((Date.now() - t) / 1000).toFixed(2);
      code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} ${args.slice(0, 6).join(" ")}… exited ${code}: ${err.slice(-400)}`));
    });
  });
}
const ff = (args, label) => run("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { label });
async function pool(items, n, fn) {
  const queue = [...items.entries()];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    for (let next; (next = queue.shift()); ) await fn(next[1], next[0]);
  }));
}
const r2 = (x) => Math.round(x * 100) / 100;
const hms = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}m${(s % 60).toFixed(1).padStart(4, "0")}s`;
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/%/g, "\\%");

// 1. Probe.
const probe = JSON.parse((await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", video])).out);
const vs = probe.streams.find((s) => s.codec_type === "video");
const hasAudio = probe.streams.some((s) => s.codec_type === "audio");
if (!vs) { console.error(`dissect: ${video} has no video stream`); process.exit(2); }

// 2. One decode of the source: a small all-intra proxy (fast to seek and filter) and the audio.
// The area scaler is about twice as fast as the default here, with the same cuts.
const proxy = path.join(WORK, "proxy.mp4");
const wav = path.join(WORK, "audio.wav");
const loudFile = path.join(WORK, "loudness.txt");
const [, { err: audioLog }] = await Promise.all([
  ff(["-threads", "0", "-i", video, "-an", "-vf", `scale=${TILE_W}:-2:flags=area,setsar=1`, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-g", "1", proxy], "proxy"),
  hasAudio
    ? ff(["-i", video, "-vn", "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", wav,
          "-vn", "-af", `silencedetect=noise=-45dB:d=0.4,ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=${loudFile}`, "-f", "null", "-"], "audio")
    : Promise.resolve({ err: "" }),
]);

// Times and frame counts come from the proxy: it is constant frame rate, and its length is the
// picture's (a container's duration includes audio that may run past the last frame).
const pp = JSON.parse((await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", proxy])).out);
const rate = (r) => { const [n, d] = String(r || "").split("/").map(Number); return n > 0 && d > 0 ? n / d : 0; };
const fps = rate(pp.streams[0].avg_frame_rate) || rate(pp.streams[0].r_frame_rate) || rate(vs.r_frame_rate) || 25;
const duration = Number(pp.format.duration);

// 3. Transcript runs in the background while the picture is measured.
const transcript = opt.transcribe && hasAudio && process.env.META_API_KEY ? transcribeWav(wav) : Promise.resolve(null);

// 4. Scene scores and black frames from the proxy.
const sceneFile = path.join(WORK, "scene.txt");
const { err: blackLog } = await ff(["-i", proxy, "-vf", `blackdetect=d=0.1:pix_th=0.10,select='gte(scene,0)',metadata=print:key=lavfi.scene_score:file=${sceneFile}`, "-f", "null", "-"], "scenes");
const scores = [];
{
  let t = null;
  for (const line of fs.readFileSync(sceneFile, "utf8").split("\n")) {
    const m = line.match(/pts_time:([\d.]+)/);
    if (m) t = Number(m[1]);
    const s = line.match(/lavfi\.scene_score=([\d.]+)/);
    if (s && t != null) scores.push({ t, s: Number(s[1]) });
  }
}
const black = [...blackLog.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => ({ start: r2(+m[1]), end: r2(+m[2]) }));
const silences = [...(audioLog || "").matchAll(/silence_start: ([\d.-]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => ({ start: r2(Math.max(0, +m[1])), end: r2(+m[2]) }));

// Hard cuts: a scene-score spike well above the frames around it (dark and soft footage scores low,
// so a fixed threshold misses real cuts), or any score over --threshold.
const W = Math.round(fps / 2);
const spike = (i) => {
  let near = 0;
  for (let k = Math.max(0, i - W); k <= Math.min(scores.length - 1, i + W); k++) if (Math.abs(k - i) > 1) near = Math.max(near, scores[k].s);
  return scores[i].s >= Math.max(0.1, 4 * near);
};
let cuts = scores.filter((x, i) => x.t > 0.05 && (x.s >= opt.threshold || spike(i))).map((x) => ({ t: x.t, s: x.s, kind: "cut" }));
// Gradual transitions (dissolves, fades through white): the picture changes a lot over half a
// second while no single step is large. Measured on 64x36 grey frames of the proxy.
const grey = (await new Promise((resolve, reject) => {
  const p = spawn("ffmpeg", ["-v", "error", "-i", proxy, "-vf", "scale=64:36,format=gray", "-f", "rawvideo", "-"]);
  const chunks = [];
  p.stdout.on("data", (d) => chunks.push(d));
  p.on("close", (c) => (c ? reject(new Error("grey frames failed")) : resolve(Buffer.concat(chunks))));
}));
const PX = 64 * 36;
const nGrey = Math.floor(grey.length / PX);
const diff = (i, j) => { let s = 0; for (let k = 0; k < PX; k++) s += Math.abs(grey[i * PX + k] - grey[j * PX + k]); return s / PX; };
const step = [0];
for (let i = 1; i < nGrey; i++) step.push(diff(i, i - 1));
for (let i = W, best = null; i < nGrey; i++) {
  const span = diff(i, i - W);
  let maxStep = 0;
  for (let k = i - W + 1; k <= i; k++) maxStep = Math.max(maxStep, step[k]);
  const gradual = span >= 30 && maxStep <= 0.25 * span;
  if (gradual && (!best || span > best.span)) best = { i, span };
  if ((!gradual || i === nGrey - 1) && best && i - best.i > W) {
    // A dissolve settles on both sides; a camera move keeps changing the picture.
    const a = best.i - W, b = best.i, settle = Math.max(a >= W ? diff(a, a - W) : 0, b + W < nGrey ? diff(b + W, b) : 0);
    if (settle <= 0.7 * best.span) cuts.push({ t: (best.i - W / 2) / fps, s: 0, kind: "gradual" });
    best = null;
  }
}
for (const b of black) {
  // A film that opens on black fades into its first shot rather than having a black shot.
  if (b.end < duration - 0.05 && b.start <= 0.05) continue;
  if (b.start > 0.05) cuts.push({ t: b.start, s: 0, kind: "to black" });
  if (b.end < duration - 0.05) cuts.push({ t: b.end, s: 0, kind: "from black" });
}
cuts.sort((x, y) => x.t - y.t);
const kept = [];
for (const c of cuts) {
  const prev = kept.at(-1);
  if (prev && c.t - prev.t < opt.minShot) { if (c.s > prev.s) kept[kept.length - 1] = c; continue; }
  kept.push(c);
}
cuts = kept.filter((c) => duration - c.t >= opt.minShot / 2);
// A film that opens on black fades into its first shot: the change from black to picture is not a cut.
const opening = black.find((b) => b.start <= 0.05 && b.end < duration - 0.05);
if (opening) cuts = cuts.filter((c) => c.t > opening.end + opt.minShot);
// Soft candidates (dissolves, whip pans, flashes) for the agent to check on the boards.
const soft = scores
  .filter((x, i) => x.s >= 0.06 && x.s > (scores[i - 1]?.s ?? 0) && x.s >= (scores[i + 1]?.s ?? 0))
  .filter((x) => !cuts.some((c) => Math.abs(c.t - x.t) < opt.minShot))
  .map((x) => ({ t: r2(x.t), score: r2(x.s) }));

const bounds = [0, ...cuts.map((c) => c.t), duration];
const shots = bounds.slice(0, -1).map((start, i) => {
  const end = bounds[i + 1];
  const into = i === 0 ? (black.some((b) => b.start <= 0.05) ? "fade from black" : "start") : { gradual: "gradual (dissolve or fade, check)" }[cuts[i - 1].kind] ?? cuts[i - 1].kind;
  return { n: i + 1, start: r2(start), end: r2(end), dur: r2(end - start), in: into, cut_score: i ? r2(cuts[i - 1].s) : null };
});
const pad2 = (n) => String(n).padStart(2, "0");

// 5. Loudness per shot (momentary LUFS, 400 ms window, sampled every 100 ms).
const loud = [];
if (hasAudio && fs.existsSync(loudFile)) {
  let t = null;
  for (const line of fs.readFileSync(loudFile, "utf8").split("\n")) {
    const m = line.match(/pts_time:([\d.]+)/);
    if (m) t = Number(m[1]);
    const v = line.match(/lavfi\.r128\.M=(-?[\d.]+|-inf)/);
    if (v && t != null) loud.push({ t, v: v[1] === "-inf" ? -120 : Number(v[1]) });
  }
}
for (const s of shots) {
  const vals = loud.filter((x) => x.t >= s.start && x.t < s.end).map((x) => x.v);
  if (!vals.length) continue;
  s.loudness = { mean: r2(vals.reduce((p, v) => p + v, 0) / vals.length), max: r2(Math.max(...vals)), min: r2(Math.min(...vals)) };
}

// 6. Pictures, all in parallel: shot boards and contact sheets from the proxy, key frames from the source.
const tileDir = path.join(WORK, "tiles");
fs.rmSync(tileDir, { recursive: true, force: true });
fs.mkdirSync(tileDir, { recursive: true });
const text = (t, y, size) => `drawtext=${fontArg}text='${esc(t)}':x=8:y=${y}:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=4`;
const tiles = shots.flatMap((s) => {
  const inset = Math.min(0.12, s.dur * 0.15);
  return [["start", s.start + inset], ["mid", (s.start + s.end) / 2], ["end", s.end - inset]].map(([pos, t], k) => ({ s, pos, t, k }));
});
const PER_BOARD = 6;
const boards = Math.ceil(shots.length / PER_BOARD);
const sheetCount = Math.ceil(duration / 20);
const pictures = Date.now();
await Promise.all([
  pool(tiles, cores, ({ s, pos, t }, i) => {
    const labels = [text(`${pos} ${t.toFixed(2)}s`, 8, 15)];
    if (pos === "start") labels.unshift(text(`S${pad2(s.n)}  ${s.start.toFixed(2)}-${s.end.toFixed(2)}s  ${s.dur.toFixed(2)}s`, 30, 17));
    return ff(["-ss", t.toFixed(3), "-i", proxy, "-frames:v", "1", "-vf", labels.join(","), "-q:v", "3", path.join(tileDir, `t${String(i).padStart(4, "0")}.jpg`)]);
  }).then(() => Promise.all(Array.from({ length: boards }, (_, b) =>
    ff(["-start_number", String(b * PER_BOARD * 3), "-i", path.join(tileDir, "t%04d.jpg"), "-frames:v", "1",
        "-vf", `tile=3x${PER_BOARD}:padding=4:color=0x202020`, "-q:v", "3", path.join(OUT, `${stem}_shots_${pad2(b + 1)}.jpg`)])))),
  ff(["-i", proxy, "-vf", `fps=1,drawtext=${fontArg}text='%{pts\\:hms}':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=4,tile=5x4:padding=4:color=0x202020`,
      "-q:v", "3", path.join(OUT, `${stem}_contact_%02d.jpg`)], "contact"),
  // Key frames by time (frame numbers are wrong for variable frame rate), one seek per shot.
  (async () => {
    const t = Date.now();
    await pool(shots, cores, (s) => ff(["-threads", "1", "-ss", ((s.start + s.end) / 2).toFixed(3), "-i", video, "-frames:v", "1",
      "-vf", "scale=1280:-2", "-q:v", "2", path.join(FRAMES, `${stem}_s${pad2(s.n)}.jpg`)]));
    timings.keyframes = +((Date.now() - t) / 1000).toFixed(2);
  })(),
]);
timings.pictures = +((Date.now() - pictures) / 1000).toFixed(2);
shots.forEach((s, i) => {
  s.frame = path.join(FRAMES, `${stem}_s${pad2(s.n)}.jpg`);
  s.board = path.join(OUT, `${stem}_shots_${pad2(Math.floor(i / PER_BOARD) + 1)}.jpg`);
});

// 7. Speech: the transcript's turns with times; each shot lists the turns heard during it. A turn
// that spans several shots is a voice-over or a sung line, not one shot's dialogue.
const tr = await transcript;
const turns = (tr?.turns ?? []).filter((u) => u.transcript?.trim()).map((u, i) => ({
  id: `T${i + 1}`, start: r2(u.startMs / 1000), end: r2(Math.max(u.endMs, u.startMs) / 1000), speaker: u.speaker ?? null, text: u.transcript.trim(),
}));
for (const s of shots) {
  const heard = turns.filter((u) => u.end >= s.start && u.start < s.end);
  if (heard.length) s.speech = heard.map((u) => u.id);
}

// 8. Write the measurements.
const totalShots = shots.length;
const durations = shots.map((s) => s.dur).sort((x, y) => x - y);
const summary = {
  video, duration: r2(duration), fps: r2(fps), size: `${vs.width}x${vs.height}`, codec: vs.codec_name,
  shots: totalShots, average_shot: r2(duration / totalShots),
  median_shot: r2(totalShots % 2 ? durations[(totalShots - 1) / 2] : (durations[totalShots / 2 - 1] + durations[totalShots / 2]) / 2),
  cuts_per_minute: r2((totalShots - 1) / (duration / 60)), threshold: opt.threshold,
};
const result = {
  summary, shots, soft_cuts: soft, black, silences,
  transcript: tr ? { text: tr.transcript ?? null, turns } : null,
  boards: Array.from({ length: boards }, (_, b) => path.join(OUT, `${stem}_shots_${pad2(b + 1)}.jpg`)),
  contact_sheets: Array.from({ length: sheetCount }, (_, b) => path.join(OUT, `${stem}_contact_${pad2(b + 1)}.jpg`)).filter((f) => fs.existsSync(f)),
};
fs.writeFileSync(path.join(OUT, `${stem}.json`), JSON.stringify(result, null, 1));

const md = [
  `# Measurements: ${path.basename(video)}`,
  "",
  `${summary.duration}s, ${summary.size} ${summary.codec} at ${summary.fps} fps. ${totalShots} shots, average ${summary.average_shot}s, median ${summary.median_shot}s, ${summary.cuts_per_minute} cuts per minute.`,
  "",
  `Shot boards (read these): ${result.boards.join(", ")}. Each row is one shot: start, middle, end.`,
  "",
  "| Shot | Start | End | Dur | In | Loudness (mean / max LUFS) | Speech |",
  "|---|---|---|---|---|---|---|",
  ...shots.map((s) => `| ${s.n} | ${s.start} | ${s.end} | ${s.dur} | ${s.in} | ${s.loudness ? `${s.loudness.mean} / ${s.loudness.max}` : ""} | ${s.speech?.join(" ") ?? ""} |`),
  "",
  soft.length ? `Soft cut candidates (check on the boards: dissolve, whip, flash, or nothing): ${soft.map((x) => `${x.t}s (${x.score})`).join(", ")}.` : "No soft cut candidates.",
  black.length ? `Black: ${black.map((b) => `${b.start}-${b.end}s`).join(", ")}.` : "No black frames.",
  silences.length ? `Silence below -45 dB: ${silences.map((b) => `${b.start}-${b.end}s`).join(", ")}.` : "No silences.",
  "",
  ...(!tr ? ["No transcript."] : turns.length ? [
    "Speech (Muse Voice Transcribe; sung lyrics come out as text too, and words can be wrong):",
    "",
    "| Turn | Start | End | Speaker | Text |",
    "|---|---|---|---|---|",
    ...turns.map((u) => `| ${u.id} | ${u.start} | ${u.end} | ${u.speaker ?? ""} | ${u.text} |`),
  ] : ["No speech."]),
  "",
].join("\n");
fs.writeFileSync(path.join(OUT, `${stem}.md`), md);

// 9. Optional template skeleton: the measured fields, ready for the descriptive ones.
if (opt.template) {
  const dir = path.join("templates", opt.template);
  fs.mkdirSync(path.join(dir, "frames"), { recursive: true });
  const file = path.join(dir, "template.json");
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  // Descriptions written on an earlier run carry over only when the shots are the same shots;
  // otherwise they are kept aside in stale_shots so nothing is lost or attached to the wrong shot.
  const old = existing.shots ?? [];
  const same = old.length === shots.length && old.every((o, i) => Math.abs((o.start ?? -1) - shots[i].start) <= 0.1);
  for (const f of fs.readdirSync(path.join(dir, "frames"))) if (/^shot\d+\.jpg$/.test(f)) fs.rmSync(path.join(dir, "frames", f));
  const t = {
    ...existing,
    meta: { ...existing.meta, source: video, duration: summary.duration, size: summary.size, fps: summary.fps, shots: totalShots, average_shot: summary.average_shot, median_shot: summary.median_shot },
    acts: same ? existing.acts ?? [] : [],
    shots: shots.map((s, i) => {
      const frame = `frames/shot${pad2(s.n)}.jpg`;
      if (fs.existsSync(s.frame)) fs.copyFileSync(s.frame, path.join(dir, frame));
      return {
        setup: null, framing: null, camera_move: null, light: null, on_screen: null, text: [], out: null,
        ...(same ? old[i] : {}),
        n: s.n, start: s.start, end: s.end, dur: s.dur, in: s.in, frame: fs.existsSync(path.join(dir, frame)) ? frame : null,
        sound: s.loudness ? `${s.loudness.mean} LUFS mean, ${s.loudness.max} peak` : null,
        voice: s.speech ? s.speech.map((id) => turns.find((u) => u.id === id).text).join(" / ") : null,
      };
    }),
    sound: { ...existing.sound, silences, black },
    look: existing.look ?? null,
    slots: existing.slots ?? [],
  };
  if (old.length && !same) t.stale_shots = old;
  else delete t.stale_shots;
  fs.writeFileSync(file, JSON.stringify(t, null, 1));
}

timings.total = +((Date.now() - T0) / 1000).toFixed(2);
console.log(md);
console.log(`Done in ${timings.total}s (${Object.entries(timings).map(([k, v]) => `${k} ${v}s`).join(", ")}).`);
if (opt.template) console.log(`Template skeleton: templates/${opt.template}/template.json (null fields are yours to fill), frames in templates/${opt.template}/frames/.`);

async function transcribeWav(file) {
  const t = Date.now();
  try {
    const base = (process.env.META_API_BASE || "https://api.meta.ai/v1").replace(/\/+$/, "");
    const form = new FormData();
    form.append("request", new Blob([JSON.stringify({ mode: "DIARIZATION", model: "muse-voice-transcribe-1.0", audioEncoding: "WAV" })], { type: "application/json" }));
    form.append("audio", new Blob([fs.readFileSync(file)], { type: "audio/wav" }), "audio.wav");
    const res = await fetch(`${base}/asr/transcribe`, { method: "POST", headers: { Authorization: `Bearer ${process.env.META_API_KEY}` }, body: form });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    return await res.json();
  } catch (e) {
    console.error(`dissect: transcript skipped (${e.message})`);
    return null;
  } finally {
    timings.transcript = +((Date.now() - t) / 1000).toFixed(2);
  }
}
