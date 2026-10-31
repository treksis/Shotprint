// Per-shot transcription (Muse Voice Transcribe): which words are spoken inside each shot.
//   node tools/shot_transcribe.mjs <video> <shots.json> <out.json>
import fs from "fs"; import path from "path"; import { execFileSync } from "child_process";
let up = path.dirname(new URL(import.meta.url).pathname);
while (!fs.existsSync(path.join(up, "v1/lib/muse.mjs"))) up = path.dirname(up);
const { transcribe } = await import(path.join(up, "v1/lib/muse.mjs"));
const [video, shotsPath, out] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(shotsPath, "utf8"));
const dir = path.join(path.dirname(out), "sa"); fs.mkdirSync(dir, { recursive: true });
for (const s of shots) {
  const wav = path.join(dir, `s${String(s.i).padStart(2, "0")}.wav`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(s.start), "-to", String(s.end), "-i", video, "-ac", "1", "-ar", "24000", wav]);
  try { const r = await transcribe(wav); s.words = (r.transcript || (r.turns || []).map((t) => t.transcript).join(" ") || "").trim(); }
  catch (e) { s.words = ""; s.transcribe_error = String(e.message || e).slice(0, 120); }
  console.log(s.i, s.words);
}
fs.writeFileSync(out, JSON.stringify(shots, null, 1));
