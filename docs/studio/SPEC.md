# Spec (draft): MuseClone Studio, an agent chat with a persistent production canvas

> **Scope (owner, 2026-10-30): a general video engine, not an ad engine.** Ads are one use; templates
> are any real film (documentary, launch film, tour, short) taken apart, and the subject can be a
> product, a person or a story.

Status: English only. Hackathon deadline: **Nov 4, 2026** (Meta Global AI Developer Hackathon).
Background: `docs/archive/PLAN.md` (product and rubric), `docs/research/` (Dreamina, Higgsfield,
Cloudflare), `sandbox/templates/bluechip-factory/TEMPLATE.md` (what a template is).

## 0. Current architecture (2026-10-31): the GUI is a front end for Muse Code

**This section wins over anything below it.** §5, §19 and §20 describe a hand-written director loop
(own tool calls, own steering, replayed demos); it was removed. The agent is **Muse Code**, Meta's
agent harness, and the GUI only shows and drives what Muse Code does.

- **One sandbox per project.** A container (`muse-harness` image) with the project's workspace
  mounted. Inside it `sandbox/host/relay.mjs` keeps one `muse serve` alive and appends every MSP
  notification to `<workspace>/.studio/events.jsonl`. The server tails that file, so a turn keeps
  running through server restarts and a finished session replays exactly as it ran.
- **The workspace is seeded** from `sandbox/kit`: `AGENTS.md` (how to work, folder layout),
  `TOOLS.md`, `bin/img` (Muse Image, logs lineage to `.studio/ledger.jsonl`), `bin/h3` (hands
  renders to the host), `tools/`, skills `template-fill` and `effects`. A picked template is copied
  from `sandbox/templates/<id>`.
- **Chat = the MSP item stream**: user messages, reasoning summaries, agent messages, tool calls
  with output. Send = `turn/start`; steer = `turn/steer`; queue = `turn/start` with `ifBusy: queue`
  (remove = `turn/unqueue`); stop = `turn/interrupt`; model = `session/setModel`; Muse's own todo
  list shows above the composer.
- **Canvas = the workspace.** Every media file and note is a node (lane by folder). Edges come from
  the agent's own records: the `bin/img` ledger (image edits), `jobs/*.jsonl` (first frame, last
  frame, guide audio, references), `cut.json` (shots → cut → final). Files a running command is
  writing show as loading nodes. Links the person draws go to `.studio/links.json` for the agent;
  undo/redo covers layout and those links.
- **What we add around Muse Code:** the canvas, file serving and uploads, the `bin/h3` host
  bridge (the GPU connection lives on the host; off unless `H3_ENABLED=1`), a per-project spend
  cap, and sending the project's brief as its first turn.
- **Code:** `src/worker/sandbox/` (docker, msp, runtime, graph), `src/worker/studio/` (routes,
  store, `sandbox.ts` interface), `src/client/features/studio/` (session store, chat, canvas).
- **Not built yet:** the Cloudflare implementation of `StudioSandbox` (deployed builds answer
  503 `no_sandbox`), fal.ai as the render backend.

---

## 1. What it is

The Studio becomes one page: **a chat with a director agent on the left, a persistent canvas on the
right**, the app sidebar kept on the far left (like Claude with Artifacts). The canvas holds the whole
production as items the user can see, move, inspect and drag: the reference ad, its dissected template,
the product sheet, the presenter, the plates for every camera setup, the voice takes, the clips, the cut
and the finished video with its score.

What makes it ours, not a Dreamina/Higgsfield clone: the agent doesn't free-style. It **fills a
dissected director's template** (`TEMPLATE.md` + `template.json`) with the user's product, using the
production method we measured to work (lab results, 2026-10-30):

| Approach | Judge score (Muse Wonder, 3 passes) |
|---|---|
| Fixed pipeline (current app backend) | 6.33 |
| Agent, no skills | 6.78 (Claude) / 6.83 (Muse) |
| Agent + effects skill | 8.06 / 8.00 |
| **Agent + director's template + hybrid H3 method (v3)** | **8.55, no major flaws** |

**Goals**
1. One project = one canvas; everything made in it persists (template, plates, takes, clips, cuts,
   versions, chat, scores).
2. The agent runs on **Muse** (the hackathon's model) and uses the same server tools the UI uses.
3. Every step is visible and steerable: the plan, each plate before it's rendered, each clip, each fix.
4. Drag and drop moves assets between the asset drawer, the canvas, the chat and the desktop.
5. Nothing spends GPU/API credit beyond a hard cap enforced in code (Live mode only).

**Non-goals (hackathon v1):** real-time multi-user editing, a full timeline editor (the cut is a list
plus a preview), user accounts beyond the existing Demo/Live passcode, folders.

## 2. Layout

```
┌──────┬─────────────────────────┬──────────────────────────────────────────────┐
│ App  │ Chat (≈420px, resizable)│ Canvas                                       │
│ side │                         │ toolbar: select · note · fit · zoom · lanes  │
│ bar  │ agent messages          │                                              │
│      │  plan (15 shots)        │  [Reference ad] [Template] [Product] [Cast]  │
│      │  step: plates 6/14  ✓   │   ── Plates ──  ▢ CAM-A ▢ CAM-B ▢ EST ▢ HERO │
│      │  step: render 8 clips … │   ── Takes  ──  ♪ L1 ♪ L2 …                  │
│      │  chips ▸ CAM-A plate ───┼─▶ ── Clips  ──  ▶ s01 ▶ s02 …                │
│      │                         │   ── Cut    ──  [timeline strip] [▶ final]   │
│      │ [attach] message [send] │  assets drawer (uploads, renders)  score 8.55│
└──────┴─────────────────────────┴──────────────────────────────────────────────┘
```

- Route stays `/studio` (project list) and `/studio/:projectId` (workspace); the app already does
  manual view routing in `App.tsx`.
- **Lanes, not chaos.** The canvas is free pan/zoom, but agent-made items land in labelled lanes in
  pipeline order (Inputs → Plates → Takes → Clips → Cut → Final). Users can move anything; new items
  still go to their lane. This keeps a 40-item production legible without a node-graph editor.
- **Artifact behaviour:** chat messages reference items as chips; a chip selects and centres the item.
  Selecting an item opens an inspector inside the canvas (versions, prompt, inputs, checks, actions).
- Divider draggable, width kept in `localStorage`; below `lg` it becomes Chat | Canvas tabs.
- Style follows `.interface-design/system.md` and `REBUILD_PLAN.md` §1: white/grey/ink, accent
  `#1a4be0`, hairline borders, no gradients, glow, glassmorphism, shadows on cards or emoji.

**What happens to today's Studio panels.** `DissectionLeftPanel`, `StoryboardCenterPanel` and
`SyncedRightPanel` stop being the page; they become **inspectors** for the Template item (dissection,
shot list) and the Cut item (storyboard + synced preview). `AgentSandboxWorkspace` is replaced by the
chat. `EmptyStudioForm` becomes the "new project" flow (reference video + product photos + brief).

## 3. Concepts

| Concept | Meaning |
|---|---|
| **Project** | The persistent unit: one canvas, one or more chat threads, one template, one product. |
| **Item** | Anything on the canvas, with a position and a lane. Kinds below. |
| **Version** | Edits, retakes and repairs create a new version; the old one stays (Dreamina behaviour). The cut uses each item's chosen version. |
| **Run** | One agent turn: plan, tool calls, results, cost, shown as steps in the chat. |
| **Template** | A dissected reference: `TEMPLATE.md` (director's decisions) + `template.json` (machine slots) + reference frames. Shipped presets (BlueChip first) plus user dissections. |

**Item kinds (v1)**

| Kind | Holds | Made by |
|---|---|---|
| `reference` | the source ad video | user upload / preset |
| `template` | TEMPLATE.md + template.json + frames; inspector = dissection + shot list | dissect tool / preset |
| `product` | product photos + **product sheet** + product lock line | user + agent |
| `cast` | presenter photos + voice reference | user / preset |
| `fill` | the filled template: slots, lines with syllable counts, shot→setup map | agent |
| `plate` | a still for one camera setup or B-roll unit (start or end) | Muse Image |
| `take` | a voice take (audio) for one line | H3 Ref2V |
| `clip` | a rendered shot (video+audio), with its mode (Ref2V / FL2V / +guide) and checks | H3 |
| `cut` | the cut list (`cut.json`): takes placed once, picture/sound windows, score, overlays | agent / user |
| `final` | the assembled MP4 + judge report | assemble + judge tools |
| `note` | free text | user / agent |

Media (images, audio, video) live in R2; items point at R2 keys. **Edges** record inputs
(plate → clip, take → clip, clips → cut) and are drawn as lines; the agent reads them as context.

## 4. Drag and drop

| From | To | Result |
|---|---|---|
| Desktop file | Canvas | Upload to R2 (`/api/assets/upload`), new item of the inferred kind |
| Desktop file | Chat | Upload, attached to the next message |
| Assets drawer | Canvas | New item pointing at the existing asset |
| Canvas item | Chat composer | Attached as a reference ("redo this plate", "why does this clip drift?") |
| Plate | Clip | Re-render request with that plate as first/last frame (asks first) |
| Clip | Cut | Adds/replaces the shot in the cut at the drop position |
| Canvas item | `Delete` / trash | Removes from canvas only; the asset stays in the drawer |

Every drop has a keyboard/menu path ("Add to canvas", "Attach to chat", "Use in cut"). Real HTML5 drag
events were never tested in the mock; test by hand.

## 5. The agent

**Model:** Muse Wonder (`muse-wonder-1.0`) for directing; Muse Spark for cheap sub-steps (line counts,
summaries). Required by the hackathon's "effective use of Meta's ecosystem" criterion.

**Loop (Higgsfield's documented pattern, our tools):** propose a plan → run steps → show results in the
chat → on a reply, re-run only what changed. The plan for a template project is the template's own
order: fill sheet → plates → voice takes → clips (FL2V) → continuity → cut → assemble → judge.

**Skills.** The agent's know-how comes from the same project skills we tested:
`template-fill` (the method) and `effects` (at most one edit-style effect), loaded into its context.
The template's Restraint section is part of every prompt it writes.

**Tools (server-side, Zod-validated, same functions the UI buttons call)**

| Tool | Does | Cost |
|---|---|---|
| `dissect_reference` | cuts, measured camera moves, per-shot words, frames → template | Muse calls |
| `fill_template` | writes the `fill` item (slots, lines, shot map), checked against template.json | text |
| `make_plate` | Muse Image edit of a reference frame → `plate` (start/end) | image |
| `check_plate` | product/cast check of a plate against the sheets (Muse vision) | text |
| `render_take` | H3 Ref2V voice take → `take` | GPU |
| `render_clip` | H3 FL2V (first+last frame, optional guide audio) → `clip` | GPU |
| `check_continuity` | plate adherence, held heads, jump cuts, grade jumps, camera move, speech windows | free |
| `update_cut` / `assemble` | edit the cut list; sync-safe assembly (no retiming) → `final` | sandbox |
| `judge` | Muse Wonder audit vs reference (3 passes) → score on `final` | text |
| `add_note`, `move_item`, `select_version` | canvas housekeeping | free |

**Hard rules, enforced in the tool layer (not the prompt)**
- **No retiming.** `assemble` rejects any speed or tempo change; takes are placed once.
- **Spend cap.** Every paid tool checks a per-session budget (GPU clips, images, Muse tokens) before it
  runs. Demo mode can't call paid tools at all; Live mode has a hard cap. Anything above a per-run
  threshold needs an approval click in the chat. Higgsfield documents its own approval step as "a
  prompt-level instruction, not a hard limit"; ours is code.
- **Edits are versions.** The agent never overwrites an item; it adds a version and says why.
- **Plates before pixels.** `render_clip` refuses a product shot whose plates haven't passed
  `check_plate` (the v1/v2 product failures came from unchecked plates).

## 6. Generation backends

One adapter interface (`submit → queued → generating → completed/failed`, results to R2):
- **Video (decided 2026-10-30):** **H3 on the Colab G4 for development** (the arena's `bin/h3` +
  bridge); **fal.ai for the shipped build** (Live mode for judges), behind the same adapter. The owner
  has fal.ai access to Seedance, H3 Max, Flux video and others, which cover the hybrid method (reference,
  first + last frame, audio). The fal.ai adapter is built later; nothing to verify now.
- **Images:** Muse Image (`/v1/images/edits`), $0.01 each.
- **Text/vision:** Muse Wonder / Spark.
- Long jobs run in **Cloudflare Workflows** (already planned in `HANDOFF_ARCHITECTURE.md`); the UI gets
  progress over the existing NDJSON/SSE stream.

## 7. Sandbox (assembly and checks)

`@cloudflare/sandbox` (already a dependency, `MuseSandbox` container in `wrangler.jsonc`) runs ffmpeg
and the template tools (`assemble.py`, `continuity.py`, `grade_match.py`, `post_text.py`). Facts from
the research: the disk does not persist, so inputs come from R2 and outputs go back to R2; sandbox IDs
are not secure, so the name is derived server-side from the project; one sandbox per session. Network
off except R2.

## 8. Data model (D1, extends `schema.sql`)

```
studio_projects   id, name, template_id, product_json, cast_json, status, created_at, updated_at
studio_items      id, project_id, kind, lane, x, y, w, h, z, label, current_version_id,
                  created_at, updated_at
studio_versions   id, item_id, parent_version_id, r2_key?, text?, params_json,
                  source ('user'|'agent'|'render'), run_id?, checks_json?, created_at
studio_edges      id, project_id, from_item_id, to_item_id, role ('first_frame'|'last_frame'|'guide'|'input')
studio_threads    id, project_id, created_at
studio_messages   id, thread_id, role, content_json, run_id?, created_at
studio_runs       id, project_id, thread_id, status, cost_json, created_at, finished_at
studio_jobs       id, run_id, item_id, backend, status, request_json, failure_reason, created_at, updated_at
```

Chat lives in D1 (simple store) for v1. Agents SDK `Sessions` is experimental (research); revisit after
the hackathon. Existing `templates` / `projects` / `project_scenes` stay for the fixed pipeline until
the canvas fully replaces it.

## 9. API

REST under `/api/studio/...`: projects (list, create, get), items (create, move, delete), versions
(create, select), edges, threads/messages, runs (start, stop, stream). The agent's run streams steps
over SSE/NDJSON. All write and paid routes require Live mode (`X-Judge-Key` check already in
`index.ts`); Demo mode serves a **pre-built project** (the v3 BlueChip × Meta glasses run) read-only,
with a replayed agent run so judges see the full loop without spending.

## 10. Frontend structure

```
src/client/features/studio/
  api.ts                 fetchers + run stream hook
  lib.ts                 layout, lanes, hit-testing, drag payload types
  types.ts               item kinds, versions, edges (shared with the worker via src/shared/types.ts)
  components/
    studio-workspace.tsx split, resize, tabs below lg
    chat/                messages, step list, chips, composer, attachments
    canvas/              viewport (pan/zoom), lanes, item cards per kind, edges, inspector, assets drawer
    inspectors/          template (dissection + shot list), cut (storyboard + synced preview), clip (checks)
```

Port of the handoff mock (`docs/studio/mock-source/`): swap `@sns/ui` → `src/client/components/ui/*`
and `cn`, remove `useT`/i18n (inline English), map tokens (`bg-soft` → `bg-muted`, `border-hairline` →
`border-border`, `bg-rail` → `bg-sidebar`), replace the media library with the assets drawer. Canvas:
the mock's own pan/zoom surface (no new dependency) unless the spike shows it can't hold ~60 items.

## 11. Phases (to Nov 4)

| Phase | Content | Done when |
|---|---|---|
| **0** (Oct 31) | `git init`; port the mock into `features/studio`; English strings; tokens; wire into `/studio`; lanes | Chat + canvas render, items pan/zoom/drag, drag and drop tested by hand |
| **1** (Nov 1) | D1 tables + REST; items/versions persist; Demo project seeded from the v3 run (plates, takes, clips, cut, final, score) | Reload keeps the canvas; Demo shows the real v3 production |
| **2** (Nov 2) | Agent on Muse Wonder with the tool table (§5); SSE step stream; spend cap + approvals; template-fill + effects skills in context | Agent fills the BlueChip template for a new product and renders plates live |
| **3** (Nov 3) | Render + assemble + judge through the adapter: H3 first, then the fal.ai adapter; continuity results on clip items; cut inspector | One end-to-end Live run on fal.ai produces a final with a score |
| **4** (Nov 4) | Polish, landing hook video from the v3 film, submission | Submitted |

## 12. Risks

- **Time.** Five days. Phase 0-1 must not slip; the Demo project (Phase 1) alone makes a strong
  submission if the live agent is late.
- **GPU backend.** H3 on Colab is development-only (manual start, ssh drops). The shipped Live mode
  uses fal.ai (adapter built later).
- **Cost.** Paid tools behind the cap; Demo is read-only.
- **Template quality.** Only one template (BlueChip) is dissected and validated; a second preset is a
  stretch goal.
- **Drag and drop** untested in automation; manual test.

## 13. Tests

- Spend cap: at, below, above the limit; Demo can't reach paid tools.
- `assemble` rejects retiming; takes placed once (sync contract).
- `render_clip` refuses unchecked product plates.
- Versions: an agent edit adds a version, never overwrites.
- Item persistence round-trip; sandbox name derived server-side.

## 14. Decisions (owner gave full permission, 2026-10-30)

1. **Phase 0 approved and built** (see §15).
2. **Video backend:** H3 (Colab) while building, fal.ai when shipping.
3. **Spend cap (default, change any time):** per Live session 24 GPU clips, 60 images, $5 of Muse
   tokens; any single run above 12 clips asks for an approval click.
4. **Demo project:** the v3 BlueChip × Meta VR Glasses run, seeded read-only.
5. **Merge:** today's panels become inspectors; the classic API pipeline stays behind the navbar toggle
   ("1) API-based") until the merge is done; "2) Agent-based" is the new Studio and the default.
6. **Templates:** BlueChip only for the submission; a second template is a stretch goal.

## 15. Phase 0 (done 2026-10-30)

- `src/client/features/studio/` (types, lib, studio-workspace, chat-panel, canvas-panel, item-card,
  inspector, assets-drawer), ported from `docs/studio/mock-source/` to this app's shadcn components,
  tokens and English strings; mounted as the Agent-based Studio view.
- Lanes Inputs → Fill → Plates → Voice takes → Clips → Cut → Final, wrapping at 7 items per row.
- Demo data: `scripts/export_demo_project.py` packs the v3 lab run into `public/demo/bluechip-v3/`
  (41 items, 55 edges, 10 MB). Sending the suggested prompt replays the real run lane by lane;
  "Show finished project" loads it at once.
- Verified in Chrome: replay, chips → select + centre, inspector (video, end frames, judge scores),
  item drag on the board, item drag onto the chat (attaches a chip), zoom buttons, no console errors.
- Not verified: HTML5 drag and drop from the desktop or the Assets drawer (browser automation can't
  produce those events), Ctrl/Cmd + scroll zoom (the automation's modifier didn't reach the page).
  Test by hand.

## 16. Phase 1 + redesign (done 2026-10-30)

Owner direction: Claude Artifacts pattern, agent-native from day 0 (no image/video/audio modes, API
mode removed), nodes with visible typed connections and loading states, `/studio` = chat-first home
with templates under the composer, `/studio/:id` = the workflow, Dreamina-style announcement bar,
seeded sample projects.

- Routes: `/studio` (home), `/studio/:id` (project), `/templates`. The old API-mode Studio,
  TemplateVault and the Phase 0 components moved out of `src/` (history in git).
- `/api/studio` (`src/worker/studio/`): templates catalog (`src/shared/studio-templates.ts`) and
  projects CRUD. Store = D1 `studio_projects` (one JSON document per project for now) in Cloudflare,
  `.data/studio-projects.json` in node dev.
- Home: composer (brief, template chip, uploads through `/api/assets/upload`), skill chips, template
  gallery with hover previews and Ready/Reference status, recent projects. Three sample projects are
  seeded on first visit.
- Project: chat on its own; the production canvas opens as an artifact panel beside it. Nodes in
  pipeline columns, ports, edges styled and labelled by role (first + last frame, guide audio,
  reference, setup plate, shot, assemble), lane frames with counts, legend, inspector with "made
  from / feeds". States: queued (dashed skeleton), running (spinner + indeterminate bar, flowing
  edges), done, failed. Everything persists (debounced PUT); an interrupted run is marked stopped.
- Demo behaviour is honest: ready templates replay the real v3 run; references and free briefs get a
  director reply that dissection/edits need Live mode (Phase 2), with the passcode button.

## 17. Libraries instead of hand-built UI (2026-10-30)

Owner: use libraries for the node system (undo/redo etc.) and the chat; hackathon, not a product.
- Canvas: **React Flow** (`@xyflow/react` 12): pan/zoom, minimap, select, Shift/Cmd multi-select,
  connect by dragging handle to handle (new edge, role "input"), Delete/Backspace removes nodes or
  edges, custom node (our NodeCard + handles), custom edge (style + label by role), lane frames as
  non-interactive background nodes, fit/tidy/zoom toolbar.
- History: **zustand + zundo** (`features/studio/store.ts`): undo/redo of nodes and edges only
  (Cmd/Ctrl+Z, Shift+Cmd+Z / Ctrl+Y, toolbar buttons), a drag is one step, paused during an agent
  run and cleared after it, so undo never takes a run apart.
- Chat: **AI Elements** (shadcn registry from Vercel): Conversation (stick-to-bottom + scroll button),
  Message + MessageResponse (markdown), Task (collapsible step list), Shimmer, Suggestions,
  PromptInput (attachments via menu, paste or drop; uploaded to `/api/assets/upload` on send).

## 18. General video framing + drag and drop verified (2026-10-30)

- Copy says video/film everywhere (home, composer, skills: Remake a video / Swap the subject /
  Vertical 9:16 cut / Dissect a video, director replies, templates page, demo prompt).
- New: files dropped on the canvas upload and become nodes where they land (undoable); files attached
  in a project chat also land on the canvas; dragging a node onto the chat attaches it again
  (React Flow `onNodeDragStop`).
- Verified in Chrome with real events (synthetic DragEvent + DataTransfer carrying a File for file
  drops, real mouse drags for handles): file drop on the canvas -> upload node; handle-to-handle drag
  -> new "input" edge (57 -> 58); node dragged onto the chat -> attached, node returned; file dropped
  on the chat composer -> attachment -> on send, upload node + message; file dropped anywhere on the
  home page -> composer attachment; reload keeps dropped nodes and new edges.

## 19. Live director (Phase 2 core) + Muse style (2026-10-30)

- The chat is now a real agent. `POST /api/studio/agent` (SSE) runs a Muse tool-calling loop
  (`src/worker/studio/agent.ts`, max 8 steps per turn) with tools `list_canvas`, `generate_image`
  (Muse Image; canvas images as references -> edits), `add_note`, `connect`. Tokens and tool calls
  are streamed from Muse (`stream: true`, OpenAI chunk format) straight to the chat; tool results
  stream as nodes/edges onto the canvas. Video rendering is not a tool yet; the system prompt makes
  the director say so instead of claiming it.
- Model picker (AI Elements PromptInputSelect): Director · Muse Spark (`muse-spark-1.3-contributor`)
  or Muse Wonder (`muse-wonder-1.0`, Live mode only). Each reply shows model and cost.
- Budget per browser session (`X-Studio-Session`), enforced server-side: demo 30 turns / 8 images /
  $0.50, Spark only; live 200 turns / 80 images / $10. `GET /api/studio/budget`; shown under the
  composer.
- First brief on a ready template still replays the real judged run; everything else is live.
- Assets (uploads + generated images) moved to `src/worker/assets.ts`: R2 in Cloudflare, `.data/assets`
  in node dev (survive restarts).
- Verified: free brief -> 2 Muse Image keyframes + reference edge ($0.02); follow-up -> note +
  2 connections using conversation memory; general question -> 77 incremental UI updates over 2.4 s
  (true streaming); Wonder in Live mode streamed ($0.0073); demo shows Wonder disabled.
- Style follows Meta's Muse (muse.ai, © Meta): Figtree as the open stand-in for Meta's Optimistic,
  #fcfcfc / #111112 / #f3f4f5, Meta blue #005abf actions and #0866ff accents, pill buttons and chips,
  500-weight headlines, soft shadow on the composer.

## 20. Agent harness: thinking, steering, queueing, stop (2026-10-30)

Meta Model API measured: tool calls (OpenAI format, parallel), token streaming, and on the Responses
API (`/v1/responses`) streamed reasoning summaries; no raw chain of thought. Server-side state via
`previous_response_id` expired mid-turn ("referenced response not found or expired"), so the director
is stateless: it keeps the turn transcript (function_call + function_call_output items) itself.
Queueing/steering/stop are harness features, built here:
- Thinking: `thinking` events -> AI Elements `Reasoning` ("Thinking…" -> "Thought for N seconds").
- Steering: while a run is active, Enter sends the text to `POST /api/studio/agent/runs/:id/steer`;
  the loop injects it before its next step (also after a final answer, triggering one more step).
  Shown in the chat as a blue "Steering" message. Run registry is in-isolate memory (a Durable Object
  would be needed for multi-isolate Cloudflare deploys).
- Queue: "Queue" holds the text in an AI Elements `Queue` above the composer; sent automatically when
  the turn ends.
- Stop: `POST /agent/runs/:id/stop` aborts the server loop and in-flight Muse call; the client aborts
  the stream.
- Image edit verified: canvas image as reference -> `/images/edits` ("edit of 1 reference"),
  composition kept, framing drifts slightly.
- Note nodes redesigned: list detection (1., -, S1) with numbered badges, readable prose, inspector
  renders markdown; image prompts shown as a quote in the inspector.
