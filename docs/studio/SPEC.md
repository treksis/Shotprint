# Spec (draft): MuseClone Studio, an agent chat with a persistent production canvas

Status: **draft for the owner's review, 2026-10-30.** Replaces the Pikvato draft
(`spec-studio.pikvato.md`, kept as reference only). English only. Hackathon deadline: **Nov 4, 2026**
(Meta Global AI Developer Hackathon), so the phases in §11 are sized to land a working demo first.

Read with: `PLAN.md` (product and rubric), `HANDOFF_ARCHITECTURE.md` (stack), `docs/research/`
(Dreamina, Higgsfield, Cloudflare), `lab/templates/bluechip-factory/TEMPLATE.md` (what a template is),
`lab/arena/results/RESULTS.md` (what the pipeline measured). **Open** marks an undecided item.

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

## 14. Open questions for the owner

1. Approve Phase 0 (port the mock into this project, lanes layout)?
2. ~~Video backend~~ **Decided:** H3 (Colab) while building, fal.ai when shipping.
3. Live-mode spend cap per session (GPU clips, images, Muse tokens) and the approval threshold?
4. Demo project: use the v3 BlueChip × Meta glasses run as the seeded showcase?
5. Merge (today's panels become inspectors, recommended) or replace the current Studio outright?
6. A second template for the demo (e.g. the Meta VR Glasses launch film or the Muse tour), or BlueChip only?
