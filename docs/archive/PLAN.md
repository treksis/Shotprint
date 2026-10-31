# Meta Global AI Developer Hackathon — Master Plan

> **Event:** Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026)  
> **Portal:** [dev.meta.ai/events/global-hackathon](https://dev.meta.ai/events/global-hackathon)  
> **Track:** Indie Developer Track (*Creativity, Technical Ambition, Functionality, Effective Use of Meta's Ecosystem*)  
> **Theme:** Build for Your World (AI Creative & Ad-Tech Workflow)  
> **Infrastructure:** 100% Cloudflare Stack (Workers, D1, R2, Workflows, Containers)

---

## 1. Product Vision: "Viral Video Reverse-Engineering & Remix Engine"

Short-form video ads (TikTok, Reels, Shorts) win or lose based on structural mechanics: the first 2-second visual hook, cut cadence, camera movement, and subject framing. 

Our platform lets any creator or brand **clone the structural DNA of a viral video for their own product in 60 seconds**:
1. **Dissect (`Meta Muse Spark` + `SAM 3.1`):** Upload any viral video. **Muse Spark** analyzes the audio-video stream to extract a reusable **Viral Blueprint Template** (scene timestamps, hook mechanics, camera grammar, pacing, and shot prompts), while **SAM 3.1** tracks and segments where the focal product sits in frame.
2. **Adapt & Keyframe (`Meta Muse Spark` + `Meta Muse Image`):** Drop in your own product photo and a 1-line brand brief. **Muse Spark** rewrites the scene prompts for your product, and **Muse Image** composites your product into pixel-accurate **First-Frame Keyframes** for every cut.
3. **Synthesize (`fal.ai` Image-to-Video + `FFmpeg`):** Each approved keyframe is animated using the extracted camera motion prompts via `fal.ai` and stitched into a finished, synchronized viral ad.
4. **Verify (`Meta Muse Spark` Closed-Loop Score):** The final rendered video is fed back into **Muse Spark** to grade its pacing and visual hook alignment against the original reference video.

---

## 2. Hackathon Strategy & Mental Model

### A. Self-Explanatory Public Landing Page + "1-Click Judge Mode"
Judges review dozens of remote submissions under tight time constraints. Our public deployment balances **enterprise SaaS polish** with **zero-friction access**:
* **Hero Section (5-Second Comprehension):** Auto-playing synchronized showcase displaying:
  `[Original Viral Video]` ➔ `[Muse Spark Blueprint & Keyframes]` ➔ `[Cloned Product Video]`
* **Dual Entry CTAs:**
  1. **`⚡ Launch Studio (Judge / Demo Mode)`:** 1-click instant entry into a pre-populated workspace—zero email signup required.
  2. **`Sign In / Workspace Login`:** Standard enterprise auth flow.

### B. Wallet & Credit Protection (`$150 Meta API` + `fal.ai` Balance)
* **Public Visitor Mode (Default `$0` Cost):** Public users exploring the app can scrub through 3–4 pre-baked viral dissections, inspect the `Muse Spark` JSON blueprint, toggle `SAM 3.1` masks, and play side-by-side rendered videos served from **Cloudflare R2** without triggering paid API calls.
* **Judge Live Mode (`?judge_key=META2026`):** The URL submitted to judges includes a secret token (or 1-click unlock code in the submission notes) that enables live **Muse Spark**, **Muse Image**, and **fal.ai** generation for custom uploads.
* **Content-Hash Caching Layer:** Every AI call is hashed (`SHA-256` of input video/image + prompt) and cached in **Cloudflare D1 + R2** so repeated runs during development and testing never burn duplicate credits.

---

## 3. 100% Cloudflare System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Browser (React + Vite Studio)                        │
│   Landing Page  │  Template Vault  │  3-Column Remix Studio  │  Sync Player │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WebSockets
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers (Hono Edge API)                      │
│          Auth / Judge Guard  •  Presigned R2 Uploads  •  Job Status         │
└──────┬───────────────────────────────┬───────────────────────────────┬──────┘
       │                               │                               │
       ▼                               ▼                               ▼
┌──────────────┐             ┌──────────────────┐             ┌───────────────┐
│ Cloudflare D1│             │ Cloudflare R2    │             │  Cloudflare   │
│ (SQLite/ORM) │             │ (Media + CDN)    │             │  Workflows    │
│ • templates  │             │ • /raw-videos    │             │ (Durable Jobs)│
│ • projects   │             │ • /products      │             └───────┬───────┘
│ • scenes     │             │ • /keyframes     │                     │
│ • api_cache  │             │ • /rendered-clips│                     │
└──────────────┘             └──────────────────┘                     │
                                                                      ▼
                     ┌────────────────────────────────────────────────────────┐
                     │              External AI & Media Pipeline              │
                     │  1. Meta Muse Spark API (Video Dissection & Prompts)   │
                     │  2. Meta SAM 3.1 API (Product Segmentation & Tracking) │
                     │  3. Meta Muse Image API (Product Keyframe Generation)  │
                     │  4. fal.ai API (Image-to-Video Scene Rendering)        │
                     │  5. CF Containers / Client WebCodecs (FFmpeg Stitch)   │
                     └────────────────────────────────────────────────────────┘
```

### Why Custom Subdomains on Cloudflare Matter Here
* `app.<yourdomain>.com` ➔ Bound to **Cloudflare Worker** (instant startup credibility).
* `cdn.<yourdomain>.com` ➔ Bound to **Cloudflare R2 Bucket** so `dev.meta.ai` (Muse Spark / Muse Image / SAM 3.1) and `fal.ai` can pull input videos and keyframes over fast, edge-cached public URLs without `.r2.dev` rate limits.

---

## 4. End-to-End AI Pipeline & Data Contracts

### Step 1: Viral Dissection (`Muse Spark` + `SAM 3.1`)
**Input:** Reference viral video URL (`https://cdn.<domain>/raw-videos/ref_01.mp4`)  
**Output:** Structured `ViralTemplateJSON` saved to D1 `templates` table:

```json
{
  "title": "High-Energy Kinetic Product Reveal",
  "duration_sec": 12.0,
  "hook_analysis": {
    "hook_type": "Extreme Close-Up Pattern Interrupt + Fast Pullback",
    "first_3_sec_retention_mechanic": "Rapid macro texture shot transitioning on beat drop at 1.4s",
    "hook_score": 94
  },
  "global_style": {
    "aspect_ratio": "9:16",
    "lighting": "High-contrast studio rim lighting",
    "pacing_cuts_per_10s": 4.2,
    "audio_cadence": "Fast-paced upbeat electronic with punchy SFX on cuts"
  },
  "scenes": [
    {
      "scene_index": 1,
      "start_time": 0.0,
      "end_time": 2.5,
      "duration": 2.5,
      "shot_type": "Extreme Macro Close-Up",
      "camera_movement": "Slow push-in then whip-pan transition",
      "original_subject": "Carbonated energy drink can with condensation droplets",
      "sam_focal_region": { "x": 0.35, "y": 0.25, "w": 0.30, "h": 0.55 },
      "template_image_prompt": "Extreme macro close-up of {{PRODUCT}}, dramatic studio rim lighting, sharp surface texture details, 9:16 vertical composition",
      "template_motion_prompt": "Smooth macro push-in toward {{PRODUCT}}, dynamic lighting reflections, commercial product cinematography"
    }
  ]
}
```

### Step 2: Product Adaptation & Keyframe Generation (`Muse Spark` + `Muse Image`)
1. **Input:** User selects a Template + uploads `product.png` + enters brief (`"AeroRun Pro — ultra-light carbon running shoe"`).
2. **Muse Spark Adaptation:** Replaces `{{PRODUCT}}` placeholders with context-aware visual descriptions tailored to the product's geometry and category while locking the original shot type, lighting, and camera motion.
3. **Muse Image Synthesis:** Calls **Muse Image** with `product.png` as reference + `adapted_image_prompt` to generate the exact starting frame (`keyframe_scene_1.png`) for each scene.
4. **Human-in-the-Loop Gate:** The UI displays all generated keyframes in the Storyboard Editor. The user can tweak a prompt or re-roll a single keyframe *before* spending `fal.ai` video credits.

### Step 3: Video Rendering (`fal.ai`) & Assembly
1. **Cloudflare Workflow** dispatches each approved `keyframe_scene_N.png` + `adapted_motion_prompt` to `fal.ai` (e.g., Kling / Wan 2.1 / Hailuo Image-to-Video).
2. As each scene finishes rendering, the clip is stored in **Cloudflare R2** and streams live into the Studio UI.
3. All scene clips are stitched into a single master `.mp4` via **Cloudflare Containers (`ffmpeg`)** or client-side WebCodecs/`ffmpeg.wasm`.

### Step 4: Closed-Loop Viral Fidelity Check (`Muse Spark`)
* Send the newly stitched `.mp4` + original `ViralTemplateJSON` back to **Muse Spark** to generate a **Viral Alignment Scorecard** (Pacing Match %, Hook Contrast Score, Product Visibility %).

---

## 5. Cloudflare D1 Database Schema (`schema.ts`)

* **`templates`**
  * `id` (TEXT PK), `title` (TEXT), `source_video_url` (TEXT), `thumbnail_url` (TEXT), `duration_sec` (REAL), `blueprint_json` (TEXT), `sam_tracking_json` (TEXT), `is_preset` (INTEGER), `created_at` (INTEGER)
* **`projects`**
  * `id` (TEXT PK), `template_id` (TEXT FK), `product_name` (TEXT), `product_brief` (TEXT), `product_image_url` (TEXT), `status` (TEXT: `draft | dissecting | keyframing | rendering | completed`), `final_video_url` (TEXT), `fidelity_report_json` (TEXT), `created_at` (INTEGER)
* **`project_scenes`**
  * `id` (TEXT PK), `project_id` (TEXT FK), `scene_index` (INTEGER), `start_time` (REAL), `end_time` (REAL), `shot_type` (TEXT), `camera_movement` (TEXT), `adapted_image_prompt` (TEXT), `adapted_motion_prompt` (TEXT), `keyframe_url` (TEXT), `video_clip_url` (TEXT), `status` (TEXT)
* **`ai_cache`**
  * `hash` (TEXT PK), `provider` (TEXT), `response_json` (TEXT), `asset_url` (TEXT), `created_at` (INTEGER)

---

## 6. UI / UX Screen Blueprint

1. **`/` — Interactive Landing Page**
   * Synchronized Before/After Hero video loop.
   * Visual diagram of the Meta AI stack (`Muse Spark` ➔ `SAM 3.1` ➔ `Muse Image` ➔ `fal.ai`).
   * Primary CTA: **`⚡ Enter Studio (Judge Mode)`** | Secondary CTA: **`Sign In`**.
2. **`/studio` — Viral Template Vault**
   * Grid of dissected viral templates showing Hook Score, Cut Count, Pacing BPM, and preview hover loops.
   * **`+ Dissect New Viral Video`** modal (upload MP4 or pick sample).
3. **`/studio/project/:id` — The 3-Column Remix Studio**
   * **Left Column (The Dissection Brain):** Original reference video player with **SAM 3.1** segmentation mask overlay toggle, Hook Analysis card, and cut timeline.
   * **Center Column (Interactive Storyboard):** Product upload card + sequential Scene Cards (`Scene 1: 0.0s–2.5s`, `Scene 2: 2.5s–5.0s`, etc.) with editable prompts, **Muse Image** keyframe previews, and per-scene action buttons.
   * **Right Column (Synchronized Compare Player):** Dual video player locking playheads between the Original Viral Video and Your Cloned Ad, plus the **Muse Spark Fidelity Scorecard** and `Export MP4`.

---

## 7. 7-Day Execution Schedule (Oct 26 – Nov 4)

| Day | Milestone | Key Deliverables |
| :--- | :--- | :--- |
| **Day 1** | **Cloudflare Foundation & UI Shell** | Initialize Vite + React + Hono Worker, bind D1 & R2, set up Drizzle schema, build Landing Page + 3-Column Studio layout with mock data. |
| **Day 2** | **Muse Spark Video Dissection** | Integrate `dev.meta.ai` **Muse Spark** API to ingest video and return strict `ViralTemplateJSON`. Add D1 hash caching. |
| **Day 3** | **Muse Image Keyframes & SAM 3.1** | Integrate **Muse Image** for product-to-scene keyframe generation + **SAM 3.1** object tracking masks on reference video. |
| **Day 4** | **`fal.ai` Video Pipeline & Workflows** | Build **Cloudflare Workflow** to trigger `fal.ai` Image-to-Video per scene, save clips to R2, and stitch final MP4. |
| **Day 5** | **Pre-baked Presets & Judge Guard** | Generate 3 high-impact end-to-end demo presets (e.g., Sneaker, Perfume, Tech Gadget). Add `?judge_key=` protection. |
| **Day 6** | **Polish, Domain & Closed-Loop Score** | Bind custom domain (`app.` + `cdn.`), add **Muse Spark** post-render Fidelity Check, polish animations & loading telemetry. |
| **Day 7** | **Pitch Video & Submission** | Record crisp 2-minute demo video (starting on Landing Page -> Live Studio -> Side-by-Side output), finalize GitHub `README.md`, submit early. |
