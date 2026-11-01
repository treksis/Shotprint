#!/usr/bin/env node
// Tools for making a director template's short cuts (docs/template_spec.md). No model calls.
//   bin/template beats <audio>                         tempo, beat grid and bar starts of a soundtrack
//   bin/template score <templates/id> <30|15>          write set/score_<n>.wav from cut<n>.score.segments
//   bin/template reference <templates/id> <30|15> <source video> <out.mp4>
//                                                      the real film cut to cut<n>, to check the cut (never ships)
//   bin/template check <templates/id>                  verify the template against the spec
// Cut schema (template.json "cut30" / "cut15"):
//   { duration, shots: [{n, from, start, end, src: [in, out]}],
//     lines: [{id, words, start, end, clip, in_score}],
//     score: {file, segments: [{src_in, src_out}], xfade_ms, fade_in, fade_out} }
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const [cmd, ...args] = process.argv.slice(2);
const USAGE = `usage:
  bin/template beats <audio>
  bin/template score <templates/id> <30|15>
  bin/template reference <templates/id> <30|15> <source video> <out.mp4> [--no-lines]
  bin/template check <templates/id>`;

function run(bin, argv, { input, binary } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, argv, { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });
    const out = [];
    let err = "";
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      const buf = Buffer.concat(out);
      code === 0 ? resolve(binary ? buf : buf.toString()) : reject(new Error(`${bin} exited ${code}: ${err.slice(-800)}`));
    });
    if (input) p.stdin.end(input);
  });
}
const ff = (argv) => run("ffmpeg", ["-nostdin", "-v", "error", "-y", ...argv]);
const duration = async (f) =>
  Number(await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]));
const r3 = (x) => Math.round(x * 1000) / 1000;

function loadTemplate(dir) {
  const file = path.join(dir, "template.json");
  if (!fs.existsSync(file)) throw new Error(`${file} not found`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function getCut(t, n) {
  const key = `cut${n}`;
  if (!t[key]) throw new Error(`template.json has no "${key}"`);
  return t[key];
}

// ---------- beats ----------
// Onset envelope (positive log-energy flux), tempo by autocorrelation weighted toward 120 bpm, beat
// phase by the strongest comb, bar phase by the strongest of the four beat offsets (4/4 assumed).
async function beats(file) {
  const SR = 11025, HOP = 256;
  const raw = await run("ffmpeg", ["-nostdin", "-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { binary: true });
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const n = Math.floor(x.length / HOP);
  const env = new Float64Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let j = i * HOP; j < (i + 1) * HOP; j++) e += x[j] * x[j];
    const l = Math.log(1e-9 + e);
    env[i] = Math.max(0, l - prev);
    prev = l;
  }
  const fps = SR / HOP;
  let best = { score: -1 };
  for (let bpm = 60; bpm <= 190; bpm += 0.25) {
    const lag = (60 / bpm) * fps;
    let s = 0;
    for (let i = 0; i + lag * 4 < n; i++) {
      const a = env[i];
      if (!a) continue;
      for (let k = 1; k <= 4; k++) {
        const j = i + lag * k, j0 = Math.floor(j), f = j - j0;
        s += a * (env[j0] * (1 - f) + env[j0 + 1] * f);
      }
    }
    s *= Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (s > best.score) best = { score: s, bpm };
  }
  const period = (60 / best.bpm) * fps;
  let phase = 0, ps = -1;
  for (let p = 0; p < period; p += 0.25) {
    let s = 0;
    for (let t = p; t < n; t += period) s += env[Math.round(t)] ?? 0;
    if (s > ps) (ps = s), (phase = p);
  }
  const beatTimes = [];
  for (let t = phase; t < n; t += period) beatTimes.push(r3(t / fps));
  let bar = 0, bs = -1;
  for (let o = 0; o < 4; o++) {
    let s = 0;
    for (let k = o; k < beatTimes.length; k += 4) s += env[Math.round(beatTimes[k] * fps)] ?? 0;
    if (s > bs) (bs = s), (bar = o);
  }
  const bars = beatTimes.filter((_, k) => k % 4 === bar);
  const beat = 60 / best.bpm;
  console.log(`tempo ${best.bpm.toFixed(2)} bpm, beat ${beat.toFixed(3)} s, bar ${(beat * 4).toFixed(3)} s (4/4 assumed; check by ear on the boards' music cues)`);
  console.log(`bar starts (s): ${bars.join(" ")}`);
  console.log(`first beats (s): ${beatTimes.slice(0, 16).join(" ")}`);
  console.log("Cut the score at bar starts: each segment's src_in and src_out on a bar start keeps the joins on the beat.");
}

// ---------- score ----------
// Each segment is extended by half the crossfade on both sides of a join, so the joined track is exactly
// the sum of the segments and every join sits on its src point.
async function score(dir, n) {
  const t = loadTemplate(dir), c = getCut(t, n), sc = c.score;
  if (!sc?.segments?.length) throw new Error(`cut${n}.score.segments is missing: [{src_in, src_out}, ...]`);
  const src = path.join(dir, "set/score.wav");
  if (!fs.existsSync(src)) throw new Error(`${src} not found`);
  const segs = sc.segments, xf = (sc.xfade_ms ?? 30) / 1000, h = xf / 2;
  const total = segs.reduce((s, g) => s + (g.src_out - g.src_in), 0);
  const parts = segs.map((g, i) => {
    const a = Math.max(0, g.src_in - (i > 0 ? h : 0)), b = g.src_out + (i < segs.length - 1 ? h : 0);
    return `[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo[s${i}]`;
  });
  let chain = "[s0]";
  for (let i = 1; i < segs.length; i++) {
    parts.push(`${chain}[s${i}]acrossfade=d=${xf}:c1=qsin:c2=qsin[j${i}]`);
    chain = `[j${i}]`;
  }
  const dur = sc.duration ?? c.duration;
  const fi = sc.fade_in ?? 0, fo = sc.fade_out ?? 0.15;
  parts.push(`${chain}atrim=end=${dur},afade=t=in:d=${fi || 0.001},afade=t=out:st=${dur - fo}:d=${fo}[out]`);
  const out = path.join(dir, sc.file ?? `set/score_${n}.wav`);
  await ff(["-i", src, "-filter_complex", parts.join(";"), "-map", "[out]", "-c:a", "pcm_s16le", out]);
  const got = await duration(out);
  let at = 0;
  const joins = segs.slice(0, -1).map((g) => r3((at += g.src_out - g.src_in)));
  console.log(`${out}: ${r3(got)} s (segments sum to ${r3(total)} s, cut ${dur} s); joins at ${joins.join(", ") || "none"}`);
}

// ---------- reference ----------
async function reference(dir, n, source, out, noLines) {
  const t = loadTemplate(dir), c = getCut(t, n);
  const shots = c.shots;
  for (const s of shots) if (!Array.isArray(s.src)) throw new Error(`cut${n} shot ${s.n} has no src [in, out] (source times)`);
  const v = shots.map((s, i) => {
    const d = s.end - s.start;
    return `[0:v]trim=start=${s.src[0]}:duration=${d},setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`;
  });
  v.push(`${shots.map((_, i) => `[v${i}]`).join("")}concat=n=${shots.length}:v=1:a=0[v]`);
  const inputs = ["-i", source];
  const scoreFile = path.join(dir, c.score?.file ?? `set/score_${n}.wav`);
  const mix = [];
  if (fs.existsSync(scoreFile)) {
    inputs.push("-i", scoreFile);
    mix.push(`[${inputs.length / 2 - 1}:a]aformat=sample_rates=48000:channel_layouts=stereo[m0]`);
  }
  if (!noLines)
    for (const l of c.lines ?? []) {
      const clip = l.clip ?? l.file;
      if (!clip || l.in_score || !fs.existsSync(path.join(dir, clip))) continue;
      inputs.push("-i", path.join(dir, clip));
      const ms = Math.round(l.start * 1000);
      mix.push(`[${inputs.length / 2 - 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms}[m${mix.length}]`);
    }
  const graph = [...v];
  const maps = ["-map", "[v]"];
  if (mix.length) {
    graph.push(...mix, `${mix.map((_, i) => `[m${i}]`).join("")}amix=inputs=${mix.length}:normalize=0:duration=longest[a]`);
    maps.push("-map", "[a]", "-c:a", "aac", "-b:a", "192k");
  }
  await ff([...inputs, "-filter_complex", graph.join(";"), ...maps, "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-t", String(c.duration), out]);
  console.log(`${out}: ${r3(await duration(out))} s, ${shots.length} shots, ${mix.length} audio layers. For checking the cut only; never put it in the template.`);
}

// ---------- check ----------
const SHOT_FIELDS = ["setup", "location", "cast", "shot_size", "subject_in_frame", "camera", "camera_move", "action", "light", "text", "out", "audio", "render", "board"];
const TOP_FIELDS = ["meta", "acts", "look", "text_style", "sound", "set", "slots", "shots"];
async function check(dir) {
  const t = loadTemplate(dir);
  const errs = [], warns = [];
  for (const k of TOP_FIELDS) if (t[k] == null) errs.push(`top level: "${k}" missing`);
  for (const f of ["TEMPLATE.md"]) if (!fs.existsSync(path.join(dir, f))) errs.push(`${f} missing`);
  const byN = new Map((t.shots ?? []).map((s) => [s.n, s]));
  const used = new Set();
  const cuts = ["30", "15"].filter((n) => t[`cut${n}`]);
  if (!cuts.length) errs.push(`no "cut30" or "cut15": a template makes 30 s and 15 s films`);
  for (const n of cuts) {
    const c = t[`cut${n}`], tag = `cut${n}`;
    if (Math.abs(c.duration - Number(n)) > 0.5) errs.push(`${tag}: duration ${c.duration}, expected ${n} ±0.5`);
    let at = 0;
    for (const s of c.shots ?? []) {
      if (Math.abs(s.start - at) > 0.05) errs.push(`${tag} shot ${s.n}: starts ${s.start}, previous ends ${r3(at)}`);
      at = s.end;
      if (!Array.isArray(s.src)) errs.push(`${tag} shot ${s.n}: src [in, out] missing`);
      const src = byN.get(s.from);
      if (!src) { errs.push(`${tag} shot ${s.n}: from ${s.from} is not a source shot`); continue; }
      used.add(s.from);
    }
    if (Math.abs(at - c.duration) > 0.05) errs.push(`${tag}: shots end at ${r3(at)}, duration ${c.duration}`);
    const sf = path.join(dir, c.score?.file ?? `set/score_${n}.wav`);
    if (!fs.existsSync(sf)) errs.push(`${tag}: ${path.relative(dir, sf)} missing (bin/template score ${dir} ${n})`);
    else {
      const d = await duration(sf);
      if (Math.abs(d - c.duration) > 0.1) errs.push(`${tag}: score is ${r3(d)} s, cut is ${c.duration} s`);
    }
    for (const l of c.lines ?? []) {
      const clip = l.clip ?? l.file;
      if (l.start == null || l.end == null) errs.push(`${tag} line ${l.id}: start/end missing`);
      if (!l.in_score && clip && !fs.existsSync(path.join(dir, clip))) errs.push(`${tag} line ${l.id}: ${clip} missing`);
    }
  }
  for (const nn of used) {
    const s = byN.get(nn);
    for (const k of SHOT_FIELDS) if (s[k] == null || s[k] === "") errs.push(`shot ${nn} (used by a cut): "${k}" empty`);
  }
  // Every set/ or boards/ path named anywhere in template.json must exist.
  const paths = new Set();
  (function walk(o) {
    if (typeof o === "string") { for (const m of o.matchAll(/\b((?:set|boards)\/[\w./-]+\.(?:png|jpe?g|webp|wav|mp3|m4a|json|ttf|otf))\b/g)) paths.add(m[1]); }
    else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v);
  })(t);
  for (const p of paths) if (!/NN|XX/.test(p) && !fs.existsSync(path.join(dir, p))) errs.push(`named in template.json but missing: ${p}`);
  // Nothing from the source film ships, except voice lines and the score.
  let bytes = 0;
  (function scan(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name), rel = path.relative(dir, p);
      if (e.isDirectory()) {
        if (e.name === "frames") errs.push(`${rel}/: source frames must not ship`);
        scan(p);
      } else {
        bytes += fs.statSync(p).size;
        if (/\.(mp4|mov|webm|mkv)$/i.test(e.name)) errs.push(`${rel}: video must not ship`);
        if (/contact|_shots_\d/.test(e.name)) errs.push(`${rel}: dissection sheets must not ship`);
      }
    }
  })(dir);
  for (const w of warns) console.log(`warn: ${w}`);
  for (const e of errs) console.log(`FAIL: ${e}`);
  console.log(`${errs.length ? "FAIL" : "OK"}: ${dir}: ${t.shots?.length ?? 0} source shots, cuts ${cuts.map((n) => `${n}s/${t[`cut${n}`].shots?.length} shots`).join(", ")}, ${paths.size} files named, ${(bytes / 1e6).toFixed(1)} MB`);
  if (errs.length) process.exitCode = 1;
}

try {
  if (cmd === "beats" && args[0]) await beats(args[0]);
  else if (cmd === "score" && args[1]) await score(args[0], args[1]);
  else if (cmd === "reference" && args[3]) await reference(args[0], args[1], args[2], args[3], args.includes("--no-lines"));
  else if (cmd === "check" && args[0]) await check(args[0]);
  else { console.error(USAGE); process.exitCode = 2; }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
