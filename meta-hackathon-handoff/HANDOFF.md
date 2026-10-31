# Handoff: Meta hackathon Muse pipeline

_2026-10-28. Written in the wrong session (sns-management/Pikvato). The work belongs to **`~/Documents/meta-hackertone`**. Open a new session there and start from this file._

## Where things are

- Project: `~/Documents/meta-hackertone` (not a git repo)
- Harness: `lab/v1/v1.mjs` (CLI, 834 lines), `lab/v1/mograph.mjs` (24fps mograph, 1939 lines), previous handoff `lab/v1/HARNESS_V1_5_HANDOFF.md`
- Web app: `src/worker` (Hono + Cloudflare, `services/ai-pipeline.ts` already calls `/chat/completions` with `json_schema`), `src/client`, `PLAN.md` (product plan), `Dockerfile` (Cloudflare Sandbox image with ffmpeg)
- Same plan, also saved at `lab/v1/PIPELINE_PLAN.md`

## Decisions so far

- Muse Spark (`muse-spark-1.3-contributor`) while building, Muse Wonder (`muse-wonder-1.0`) for the shipped run. Contributor mode is fine (hackathon). We're in Canada, so the "Wonder not available in South Korea" note doesn't apply.
- **Fixed pipeline, not agentic.** Muse fills schema-constrained fields in fixed steps; code decides the flow and compiles the prompts.
- fal.ai does video generation, called later. This plan covers everything up to that call.
- New consenting cast with their own voice sample. No real public figures (the old Zuckerberg/Amodei/Musk editions) and no other companies' branding in the shipped version.
- Build the pipeline first; the demo video comes later.

## Meta Model API notes (dev.meta.ai/docs)

- Base `https://api.meta.ai/v1`, Bearer key. OpenAI- and Anthropic-SDK compatible (Chat Completions, Responses, Messages).
- Structured output: `response_format: {type: "json_schema", json_schema: {name, strict, schema}}` (Chat Completions) or `text.format` (Responses). Decoding is constrained, so output always matches. Strict mode: object root, `additionalProperties: false` everywhere, every property required, no `oneOf`/`allOf`, no recursion, depth ≤ 10.
- `reasoning_effort`: minimal…max (`none` → 400; `max` not on contributor). Reasoning tokens count against `max_tokens`.
- Video in: mp4 via Files API (`purpose: "user_data"`) + `input_file`, or `video_url`. Size/duration limits not documented.
- Muse Image: `/v1/images/edits`, 1–10 reference images, no `seed`, no mask, $0.01/image, 150 RPM.
- Prices per 1M tokens: Spark $1.25 in / $4.25 out (contributor $0.10 / $0.20); Wonder $4 / $20. 3,000 RPM for Spark and Wonder, 150 for contributor.
- No documented `temperature`/`seed`, so reproducibility comes from caching, not sampling settings.

---

# Pipeline Build Plan: brief → Muse → fal.ai-ready render jobs

_2026-10-28. Covers everything up to the fal.ai video call. fal.ai, mograph compositing and stitching come after and are out of scope here._

## 0. Decisions this plan assumes

| Decision | Choice |
| :-- | :-- |
| Text model | `muse-spark-1.3-contributor` while building, `muse-wonder-1.0` for the shipped run. One env var switches it. Contributor mode is fine (hackathon; data goes to Meta by design). |
| Pattern | **Fixed pipeline, not an agent.** Muse is called in 4 fixed slots. Each call is one schema-constrained function. Code decides every next step. |
| Video backend | fal.ai (called later). The pipeline produces **backend-neutral render jobs**; the existing Colab H3 compiler stays as a second adapter. |
| Cast | A new person who consents, plus their own voice sample. No real public figures, no other companies' branding. |
| Engine | `lab/v1` (the harness) is the engine. The web app (`src/worker`) calls it later; we don't keep two pipelines. |

## 1. What exists today (and the gap)

- `v1.mjs` has **no LLM call at all**. Every project JSON (sheets, plates, segments, Ref2VA prompts) was written by hand or by a coding agent. `doctor` exists to repair that hand-written free text.
- `muse-image-1.0` is already wired (`generateEditedImage`, `/v1/images/edits`).
- Paths are hard-coded to `/Users/howoojang/...` (API key path, `v1OutDir`, report paths, Colab `cssh`). A container can't run it as is.
- Mograph scenes (`VALID_MOGRAPH_SCENES`) are bespoke per edition (`duo_unfold_canvas`, `proled_kinetic_specs`, ...). A new brief can only reuse them, and their on-screen text is baked into the scene code.
- `src/worker/services/ai-pipeline.ts` already makes a structured-output call to `/chat/completions`, but with a different shape (4 × 2.5s, 9:16). It will be replaced by calls into the engine.

**The core change:** Muse fills **fields**; code **compiles** prompts. Gates 2, 3 and 4 (one `<d>` block, closed-lip lock, multicam refs) stop being checks and become impossible to break, because no model writes the prompt text.

## 2. Pipeline (all steps before fal.ai)

```
brief.json + template.mp4 + cast/product photos + voice.wav
  │
  ├─ S1 analyze   Muse Spark (video in)   → blueprint.json     6 beats × 5.04s
  ├─ S2 plan      Spark / Wonder          → plan.json          fields only, enums for every choice
  ├─ S3 compile   code                    → project.json       prompts built from fields
  ├─ S4 doctor    code                    → pass | errors      semantic gates (syllables, UI-slop, refs, timing)
  │     └─ S4b repair  Muse (1 call max)  → patch.json         only the failing fields; then doctor again, else fail hard
  ├─ S5 sheets    Muse Image              → identity sheets    cached by content hash
  ├─ S6 plates    Muse Image              → 16:9 plates        cached by content hash
  ├─ S7 preflight Muse Spark (image in)   → plate_qa.json      looks at each plate: text/UI artifacts? identity drift? (optional gate)
  └─ S8 jobs      code                    → render_jobs.json   backend-neutral, one per segment  ← fal.ai starts here
```

Every Muse call goes through one function and one on-disk cache, so re-running any step with the same inputs is free and returns the same output.

## 3. Data contracts

All schemas must be **strict-mode compatible** (Model API rules): root is an object, `additionalProperties: false` on every object, every property in `required`, no `oneOf`/`allOf`, no recursion, depth ≤ 10. Optional values are expressed as `anyOf: [{type}, {type: "null"}]`.

### `brief.json` (input, human-written)
```json
{
  "brief_id": "acme-glasses-01",
  "product": { "name": "", "one_liner": "", "key_features": ["", "", ""], "photos": ["product/front.png"] },
  "cast": { "description": "", "photos": ["cast/front.png", "cast/threeq.png"], "voice_ref": "cast/voice.wav" },
  "template_video": "templates/ref.mp4",
  "tone": "",
  "language": "en"
}
```

### `blueprint.json` (S1 output)
`{ title, total_sec: 30.24, beats: [6 × { index, start_sec, end_sec, purpose: enum[hook, problem, feature, demo, proof, outro], shot: enum[frontal_chest, threeq_chest, hands_detail, product_hero, wide], camera_move: enum[static, push_in, pull_out, pan, cut_in_beat], has_cut_mid_beat: bool, speech: enum[on_camera, voiceover, none], ui_moment: enum[none, full_ui, hybrid_split, hybrid_head_split], template_frame_sec: number, notes: string }] }`

### `plan.json` (S2 output)
```
segments: 6 × {
  id, beat_index,
  type: enum[studio_hook, ui_unfold, multicam_cut, worker_broll_vo, product_hero, outro],
  dialogue: string,                         // checked by doctor, ≤ max_syllables
  shot: { framing: enum, angle_deg: enum[0, 35, 90], lens_mm: enum[35, 50, 85], action: string },
  refs: { plate_id: string, extra_ids: string[] },
  mograph: anyOf[null, { mode: enum[full_ui, hybrid_split, hybrid_head_split], scene: enum[<generic scenes>], split_sec: number, props: { headline, subline, bullets[3], cta } }],
  music_cue: string, sfx_cue: string
}
plates: n × { id, template_beat_index, inputs: enum-of-uploaded-asset-ids[], scene_description: string }
sheets: { cast_sheet: {...}, product_sheet: {...} }
```
`enum`s come from code at request time (uploaded asset IDs, the mograph scene list), so Muse **cannot** reference a file or scene that doesn't exist. That removes Gate 0 and Gate 6 repairs.

### `render_jobs.json` (S8 output, the fal.ai hand-off)
```
{ project_id, fps: 24, width: 1280, height: 720, jobs: 6 × {
  id, seconds: 5.04,
  first_frame: "plates/<plate>.png",        // image-to-video keyframe
  reference_images: [...],                  // for models that take refs
  motion_prompt: string,                    // compiled, short, no on-screen text
  dialogue: string, speech: on_camera|voiceover|none, voice_ref: "cast/voice.wav",
  negative: string,
  mograph: {...} | null,                    // applied after fal returns
  h3_prompt: string                         // Colab adapter only
}}
```
Which fal.ai model we use decides whether `dialogue` is spoken by the video model or added later by TTS + lip-sync. The job carries both, so that choice doesn't change anything above S8.

## 4. Files to build

| File | What |
| :-- | :-- |
| `lab/v1/config.mjs` | Every path from `LAB_DIR` / `OUT_DIR` env (defaults relative to the repo), model IDs from `MUSE_TEXT_MODEL` (default `muse-spark-1.3-contributor`), `META_API_KEY` from env only. Removes all `/Users/howoojang` literals. |
| `lab/v1/lib/muse.mjs` | `callStructured({ step, model, effort, messages, schema })`: `POST /v1/chat/completions` with `response_format: {type: "json_schema", json_schema: {name, strict: true, schema}}`, `reasoning_effort`, `max_tokens`. Cache key = sha256(model + messages + schema + effort); cache in `lab/v1/cache/<step>/<hash>.json` with raw response, usage and cost. Retries only on 429/5xx (3×, backoff). `uploadFile()` via `/v1/files` (`purpose: "user_data"`) for video. Also moves `generateEditedImage` here with the same cache. |
| `lab/v1/schemas/*.mjs` | `blueprint`, `plan`, `repair`, `plateQa` JSON Schemas as builder functions (`planSchema({ assetIds, mographScenes })`) so enums are injected. Plain JSON Schema, no new deps. |
| `lab/v1/prompts/*.md` | System prompts per step, versioned. The prompt file's hash is part of the cache key. |
| `lab/v1/compile.mjs` | Pure functions: `compileProject(brief, blueprint, plan) → project.json` (current manifest shape, so `mograph.mjs` and `finalize` keep working), `compileH3Prompt(seg, proj)` (the existing `autoHealSegmentPrompt` synthesis branch, generalized: no Zuckerberg defaults), `compileMotionPrompt(seg)` for fal. |
| `lab/v1/doctor.mjs` | Gates moved out of `v1.mjs`, returning `{ errors: [{ path, gate, message }] }` instead of `process.exit`. Gates left: 1 syllables, 5 UI-slop regex, refs exist on disk, split_sec range, total timing = 30.24s. |
| `lab/v1/steps/{analyze,plan,repair,sheets,plates,preflight,jobs}.mjs` | One file per step, each `async (ctx) → writes one artifact`. Skips if its artifact exists and inputs hash matches. |
| `lab/v1/v1.mjs` | New commands: `analyze`, `plan`, `jobs`, and `run --brief brief.json [--until jobs] [--model wonder]`. Old commands keep working on existing manifests. |
| `lab/v1/mograph.mjs` | Add 4 **generic, props-driven** scenes (`title_card`, `feature_callout`, `phone_ui`, `outro_lockup`) whose text comes from `plan.mograph.props`. The bespoke edition scenes stay but aren't offered to the planner. |
| `lab/v1/tests/` | `node --test`: schema strict-mode validator, compile golden tests, doctor tests, and a fake `fetch` so tests never call Meta. |

## 5. Build order (each step ends runnable)

1. **De-hardcode** (`config.mjs`), rerun `node lab/v1/v1.mjs doctor` on an existing project to confirm nothing broke. _Unblocks the container._
2. **`muse.mjs` + cache.** Smoke test: one structured call on Spark with a 3-field schema; second run hits the cache.
3. **`compile.mjs` + `doctor.mjs`** extracted from `v1.mjs`, with tests. Hand-write one `plan.json` for the new cast and confirm it compiles to a manifest `doctor` passes.
4. **S2 `plan`** with Spark: brief + a hand-written blueprint → `plan.json` → compile → doctor. Add S4b repair. _First real Muse-driven project._
5. **S1 `analyze`**: upload template mp4 via Files API, Spark returns `blueprint.json`. Compare against your manual dissections of the same template.
6. **Generic mograph scenes** (4), driven by `props`.
7. **S5/S6** through the new client (cache, assets from the brief), **S7 preflight** on plates.
8. **S8 `jobs`** → `render_jobs.json`. Stop here; fal.ai adapter is next.
9. **Golden runs**: 3 briefs × {Spark, Wonder}. Record doctor pass rate on first try, repair count, tokens, cost, wall time into `lab/v1/evals/<date>.json`. That table is the pitch slide for "Muse in the loop".

## 6. Determinism rules

- Model output isn't reproducible by sampling settings (no documented `temperature`/`seed`; Muse Image rejects `seed`). Reproducibility comes from the **cache**: same inputs → same stored output.
- Artifacts are frozen once a step passes. Re-running a step needs `--force <step>`, which invalidates only that step and those after it.
- Every artifact records `{ step, model, prompt_hash, schema_hash, input_hashes, created_at }`.
- Muse is never asked to write prompt syntax (`<d>`, `<Picture N>`, `[Shot N]`), file paths or scene names. Only fields and enum picks.

## 7. Open items

- Which fal.ai model (I2V with audio vs. I2V + separate TTS/lip-sync). Doesn't block steps 1–8.
- Exact Chat Completions limits for video input size/duration (not in the docs; test in step 5 and fall back to 1fps frames as images if needed).
- Cost check: Spark contributor is ~$0.10 / $0.20 per 1M in/out tokens; Muse Image $0.01 per image; one full run before fal should cost cents.
