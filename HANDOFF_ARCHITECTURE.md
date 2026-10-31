# MuseClone — Streamlined Cloudflare + Meta Muse Architecture

## 1. Goal
Build an AI-native short-form video ad studio where users drag-and-drop a reference video (and product photo), an AI pipeline dissects it into an editable **`hyperframe.json`** state, and users revise cuts via chat or controls before rendering replacement clips and assembling the final MP4.

---

## 2. Verified Cloudflare + Meta Stack (Lean & Production-Safe)

| Layer | Technology | Role & Key Config |
| :--- | :--- | :--- |
| **Frontend** | **Vite + React 19 + shadcn/ui** | `/` (Landing), `/studio` (Dissection, Hyperframes, JSON, Chat), `/templates` (Saved templates). Keep Vite SPA on Workers (avoid Next.js OpenNext bundler overhead). |
| **API & Routing** | **Cloudflare Workers + Hono** | Auth guard (`X-Judge-Key` vs `JUDGE_PASSCODE`), R2 upload/stream, NDJSON/SSE streaming. |
| **Storage & DB** | **Cloudflare R2 + D1** | **R2** stores uploaded videos, product photos, extracted keyframes, `hyperframe.json` versions, and rendered MP4s. **D1** stores templates, projects, and async job status (`submit → queued → generating → completed/failed`). |
| **Async Pipeline** | **Cloudflare Workflows** | Durable execution for 1–10 min `fal.ai` queue jobs (`fal.queue.submit` + durable `step.sleep` status polling + webhook support). Replaces the need for separate Cloudflare Queues. |
| **Media Sandbox** | **Cloudflare Sandbox SDK (`@cloudflare/sandbox`)** | Isolated Linux microVM running native **FFmpeg** for frame extraction & MP4 stitching (`"SANDBOX_TRANSPORT": "rpc"` in `wrangler.jsonc`). Use `@remotion/player` client-side in React if timeline preview is needed; keep headless Chromium out of the container. |
| **Meta AI Models (25% Rubric)** | **Meta Model API (`dev.meta.ai`)** | 1. **Muse Voice Transcribe**: Audio & spoken hook transcription.<br>2. **SAM 3.1**: Product focal bounding boxes per hyperframe.<br>3. **Muse Spark**: Cut dissection, `hyperframe.json` generation, and chat-based JSON revision.<br>4. **Muse Image**: Replacement product keyframes per cut. |
| **Video Motion** | **fal.ai Queue API** | Image-to-video motion generation (Kling / Wan / Seedance) from Muse Image keyframes. |

---

## 3. Canonical State: `hyperframe.json`
Every dissected video produces a versioned `hyperframe.json` stored in D1/R2:
- `hookAnalysis`: First 3s hook, spoken transcript (`Muse Voice Transcribe`), retention score.
- `globalStyle`: Aspect ratio, lighting, pacing cuts/10s, audio cadence.
- `hyperframes[]`: Anchor timestamps (`0.0s`, `2.5s`, `5.0s`, `7.5s`), extracted frame URLs, and `SAM 3.1` product bounding boxes (`{ x, y, w, h }`).
- `scenes[]`: Shot type, camera movement, what happens, on-screen text, image prompt (`Muse Image`), motion prompt (`fal.ai`), and render status/output URLs.

---

## 4. Core Execution Flow
1. **Ingest (`Stage 1`)**: User drags and drops a reference `.mp4`/`.mov` video into `/studio` -> stored in **R2** (`/api/assets/upload`).
2. **Dissect & Stream (`Stage 2`)**: `/api/templates/dissect-stream` extracts hyperframes, runs **Muse Voice Transcribe + SAM 3.1 + Muse Spark**, streams progress to the UI, and outputs `hyperframe.json`.
3. **Revise & Swap (`Stage 3`)**: User edits cuts directly or via chat prompt -> **Muse Spark** patches `hyperframe.json` -> **Muse Image** generates replacement product keyframes.
4. **Async Render (`Workflow`)**: Worker enqueues `fal.ai` video generation -> Workflow polls/waits for completion -> **FFmpeg Sandbox** stitches scene clips -> saves final MP4 to **R2**.

---

## 5. Security & Judge Controls
- All `META_API_KEY`, `FAL_KEY`, and `JUDGE_PASSCODE` secrets stay strictly in Cloudflare Worker secrets.
- Public visitors run in **Demo Mode** (instant pre-computed examples + cached sample dissection stream).
- Entering the **Judge Passcode** enables **Live Mode** (`sessionStorage` + server-side constant-time header check) with per-session quotas and spend caps.

---

## 6. MVP Checklist
- [x] Public app with server-verified Judge Passcode & Demo/Live banner
- [x] Clean URL routing (`/`, `/studio`, `/templates`) with `shadcn/ui` `AppSidebar`
- [x] Drag-and-drop video & image upload to R2 (`/api/assets/upload`)
- [x] Streaming dissection into Hyperframes & inspectable Template JSON (`/api/templates/dissect-stream`)
- [ ] Chat-based revision panel that mutates `hyperframe.json` via Muse Spark
- [ ] Async job status polling (`submit → queued → generating → completed`) for `fal.ai` + Muse Image
- [ ] Cloudflare Sandbox FFmpeg stitcher for final MP4 assembly
