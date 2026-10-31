#!/usr/bin/env node
// Muse Image (muse-image-1.0, $0.01/image) -> 1280x720 PNG (720x1280 with --portrait).
//   bin/img --out plates/a.png --prompt "..." [--image in.png --image ref.jpg ...] [--fit crop|pad] [--portrait]
// No --image = text to image; with images = edit / composite (refer to them as "image 1", "image 2"...).
// Every call is recorded in .studio/ledger.jsonl, which is how the Studio canvas draws "made from" edges.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = (process.env.META_API_BASE || "https://api.meta.ai/v1").replace(/\/+$/, "");
const MODEL = process.env.MUSE_IMAGE_MODEL || "muse-image-1.0";
const FIT = {
  crop: (w, h) => `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:exact=1,setsar=1`,
  pad: (w, h) => `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0xE8E8E6,setsar=1`,
};
const MIME = { ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

const a = process.argv.slice(2);
const images = [];
let out, prompt, fit = "crop", portrait = false;
for (let i = 0; i < a.length; i++) {
  if (a[i] === "--out") out = a[++i];
  else if (a[i] === "--prompt") prompt = a[++i];
  else if (a[i] === "--image") images.push(a[++i]);
  else if (a[i] === "--fit") fit = a[++i];
  else if (a[i] === "--portrait") portrait = true;
  else if (a[i] === "--aspect" || a[i] === "--model") i++; // accepted for compatibility, ignored
}
if (!out || !prompt || !FIT[fit]) {
  console.error("usage: bin/img --out f.png --prompt '...' [--image x.png ...] [--fit crop|pad] [--portrait]");
  process.exit(2);
}
if (!process.env.META_API_KEY) { console.error("img: META_API_KEY is not set"); process.exit(2); }
for (const p of images) if (!fs.existsSync(p)) { console.error(`img: no such image ${p}`); process.exit(2); }

const dataUrl = (p) => `data:${MIME[path.extname(p).toLowerCase()] || "image/jpeg"};base64,${fs.readFileSync(p).toString("base64")}`;
const body = images.length
  ? { endpoint: "/images/edits", json: { model: MODEL, prompt, images: images.map((p) => ({ image_url: dataUrl(p) })) } }
  : { endpoint: "/images/generations", json: { model: MODEL, prompt } };

let data;
for (let attempt = 1; ; attempt++) {
  const res = await fetch(`${BASE}${body.endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.META_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body.json),
  });
  if (res.ok) { data = await res.json(); break; }
  const text = await res.text();
  if (attempt >= 3 || (res.status < 500 && res.status !== 429)) { console.error(`img: ${res.status} ${text.slice(0, 300)}`); process.exit(1); }
  await new Promise((r) => setTimeout(r, 2000 * attempt));
}
const b64 = data?.data?.[0]?.b64_json;
if (!b64) { console.error("img: no image returned"); process.exit(1); }

const target = path.resolve(out);
fs.mkdirSync(path.dirname(target), { recursive: true });
const raw = `${target}.raw`;
fs.writeFileSync(raw, Buffer.from(b64, "base64"));
const [w, h] = portrait ? [720, 1280] : [1280, 720];
execFileSync("ffmpeg", ["-y", "-i", raw, "-vf", FIT[fit](w, h), "-f", "image2", "-c:v", "png", target, "-loglevel", "error"]);
fs.rmSync(raw, { force: true });

const rel = (p) => path.relative(ROOT, path.resolve(p));
fs.mkdirSync(path.join(ROOT, ".studio"), { recursive: true });
fs.appendFileSync(
  path.join(ROOT, ".studio/ledger.jsonl"),
  JSON.stringify({ tool: "img", out: rel(out), inputs: images.map(rel), prompt, t: Date.now() }) + "\n"
);
console.log(`img: wrote ${out} (${w}x${h})${images.length ? ` from ${images.join(", ")}` : ""}`);
