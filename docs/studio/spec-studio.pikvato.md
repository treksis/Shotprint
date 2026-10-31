# Spec (draft): Studio, an agent chat with a persistent canvas

Status: **draft for the owner's review. Only the Phase 0 mock exists (branch `feat/studio-mock`, route `/studio`, in-memory, nothing saved).** It adds new Cloudflare bindings, so it touches `PLAN.md` and needs the owner's approval before any structural work (`AGENTS.md`, "Cloudflare tooling").

Read first: `AGENTS.md`, `DESIGN.md`, `docs/CONVENTIONS.md`, `PLAN.md`. Reference research is in §12. Everything marked **Open** is undecided, not assumed.

---

## 1. What it is

A new app page, **Studio**. The left half is a chat with an agent, the right half is a persistent canvas of everything the agent and the user make: prompts, images, videos, captions and post drafts. It works like Claude with Claude Artifacts. The app sidebar stays on the left as it is today.

Why it fits Pikvato: the backend already has most of it. There is a Media library (R2), posts and scheduling, a calendar, entitlements and usage metering, and an MCP server whose 25 tools do what the UI does. Studio adds the creation step in front of that: prompt, assets, caption, then a post the user approves.

**Goals**
1. Everything made in a project persists: prompts, references, generations, versions, chat history.
2. The agent uses the same services as the UI and MCP (human and agent parity, `PRODUCT.md`).
3. Drag and drop moves assets between Media, the canvas, the chat and the desktop.
4. Nothing is published or spent without an explicit user action enforced in code.

**Non-goals (v1)**
- Real-time multi-user editing (Dreamina doesn't have it either).
- Changing the Posts page or its composer. They stay as they are for platform review.
- A video timeline editor.
- Folders (same decision as Media).

## 2. Layout

```
┌────────┬──────────────────────────┬────────────────────────────────────┐
│ App    │ Chat (≈ 400px, resizable)│ Canvas                             │
│ side-  │                          │  toolbar: select · note · fit · …  │
│ bar    │  messages                │  ┌────────┐    ┌────────┐          │
│        │   agent steps            │  │ prompt │───▶│ image  │  items   │
│        │   item chips ───────────────▶ select    │ └────────┘ ┌──────┐ │
│        │                          │                           │ post │ │
│        │ [attach] message…  [send]│  assets drawer (Media)    └──────┘ │
└────────┴──────────────────────────┴────────────────────────────────────┘
```

- Routes: `/studio` (project list, hairline rows) and `/studio/$projectId` (the workspace). Nav entry after Media, above Developers.
- The page uses the full width (like `AppPage wide`, no max-width). The divider between chat and canvas is draggable and remembered per user in `localStorage`. The canvas can be collapsed to leave chat only.
- **Artifact behaviour:** a message can reference canvas items as chips. Clicking a chip selects and centres that item. Selecting an item shows its details and versions in a side panel inside the canvas, not in a new sheet.
- Below `lg`: tabs (Chat | Canvas) instead of a split.
- Style: flat, hairline dividers, `bg-soft` fills, stadium controls, no shadows except floating layers. No nested cards, no pill kickers (`impeccable detect` must report 0).

## 3. Concepts

| Concept | Meaning |
| :-- | :-- |
| **Project** | The persistent unit. Owns one canvas and its threads. Belongs to one workspace. |
| **Item** | One thing on the canvas, with a position. Kinds below. |
| **Version** | Edits and regenerations create a new version. The original stays (Dreamina behaviour). |
| **Thread** | One chat conversation inside a project. A project can have several. |
| **Run** | One agent turn: its steps, tool calls and results, shown in the chat. |

**Item kinds (v1):** `note` (text or prompt), `image`, `video`, `audio`, `reference` (character, product, style: a labelled set of images), `post` (a draft: caption + media + target channels), `group`.
Images, videos and audio are not stored in Studio. An item points to a `media_assets` row, so everything stays in the Media library and is subject to the same storage limit.

**Connections:** an item can list other items as inputs (prompt → image, image → video). v1 stores them as edges and draws them as lines. The agent reads them as context.

## 4. Drag and drop

| From | To | Result |
| :-- | :-- | :-- |
| Assets drawer (Media library) | Canvas | New item pointing at the existing asset |
| Desktop file | Canvas or chat | Uploaded through the existing media upload queue, then an item (canvas) or an attachment (chat) |
| Canvas item | Chat composer | Attaches the item as a reference for the next message |
| Canvas item | Another item | Creates an input edge |
| Canvas item | `post` item | Adds it to the draft's media (order = drop order) |
| Chat attachment or message image | Canvas | Becomes an item |
| Canvas item | Trash zone, `Delete` key | Removes the item from the canvas only. The Media asset is kept. |

Requirements: keyboard alternative for every drop (menu action "Add to canvas", "Attach to chat"), visible drop targets, and a drag preview. A media file used by a `post` item that is scheduled keeps the existing delete guard in Media.

## 5. The agent

**Runtime (Open: confirm in §11).** Cloudflare Agents SDK. Per its docs, an `Agent` is a Durable Object and has built-in state sync to clients over WebSockets (`useAgent`), scheduling, and `AIChatAgent` adds server-side, client-side and human-in-the-loop tools. Its `Sessions` capability stores chat history as a tree (branches, compaction, full-text search) but is marked **Experimental**.

**What lives where**
- **D1 (source of truth):** projects, items, versions, edges, runs, generation jobs. Tenant-scoped with `organization_id`, cascade-deleted with the workspace.
- **Durable Object per project:** the live session (WebSocket, streaming, thread messages). **Open:** keep chat history only in the DO's SQLite (Sessions), or mirror to D1. Whichever we choose, **account deletion must delete it** (we missed R2 files once; same trap).
- **R2:** all binary assets, via the existing media service.

**Tools.** The agent calls the same `packages/core` services as REST and MCP, never raw SQL. Two groups:
1. *Existing tools* (list media, create post, list channels, etc.). Reused as is.
2. *Studio tools:* `add_item`, `update_item`, `connect_items`, `create_version`, `generate_image`, `generate_video`, `draft_post`, and so on. Each is a core service with a Zod schema, exposed to REST and MCP too, so an outside agent such as Claude can drive the same canvas.

**Steps are visible.** Each run renders as a list of steps in the chat (plan, tool call, result, cost). The user can stop a run. Editing existing items by the agent must show up as a new version, never an in-place overwrite.

**Hard rules (enforced in the tool layer, not in the prompt)**
- The agent can **never** publish or schedule on its own. `draft_post` only creates a `post` item. Sending it to Posts or scheduling needs a user click (a separate endpoint that checks the session, not the agent's token).
- **Spend:** generation tools consume credits and check a hard per-workspace limit before running (`assertWithinLimit`, a new `generationCredits` limit, metered even when monetisation is off). Higgsfield's own docs say their approval step is "a prompt-level instruction, not a hard limit" and that agents have no native cap. We don't copy that.
- Anything above a per-run cost threshold needs an approval click. Default threshold is **Open**.

## 6. Generation providers

**Open, needs the owner.** Which models and provider(s) (Seedream/Seedance via Higgsfield's API, others). Design constraint either way: a provider adapter interface in `packages/core` (same spirit as the social SDK: stateless, Zod-parsed responses, classified errors), jobs run through a queue with `{ type, v, jobId }` messages, results are written to R2 and `media_assets`, never streamed through the Worker. Provider keys are Worker secrets. No provider calls in tests.

## 7. The microVM sandbox (later phase)

Purpose: let the agent run code to *make* things the model APIs can't: trim and concatenate clips, extract frames, resize and crop, build contact sheets, burn captions. This is the "Claude with a computer" part.

Facts from the Cloudflare docs (sandbox pages, read 2026-10-30):
- Each instance is a microVM with its own kernel and network. A sandbox is addressed by name from a Worker and is backed by a Durable Object.
- **The disk does not persist.** Stopping an instance deletes its files. Keeping files means R2 (a mounted bucket's objects remain) or snapshots (public beta, expire 30 days after creation or last restore, max 20 GB).
- Idle instances stop; the inactivity timeout can be extended up to 6 hours.
- Available on the Workers Paid plan. The scheduling policy for sandbox containers is in public beta. Pricing page not read yet.
- The docs show two versions (0.x and 1.0) with different APIs. **Open:** pick one and verify against the installed `@cloudflare/sandbox` before building.
- Sandbox IDs are "not cryptographically secure", so the sandbox name must be derived on the server from workspace + project, never taken from the client, and one sandbox per workspace.
- Whether `ffmpeg` is available out of the box is **not stated**. Plan for a custom image.

Design: the sandbox is a disposable workbench. Inputs are copied from R2, outputs are written back through the media service, and nothing is kept only inside the VM. Network access off by default. The agent's sandbox use is a tool (`run_in_sandbox`) with time and output-size limits, metered like generation.

## 8. Data model (sketch, migration later)

```
studio_projects     id, organization_id, name, created_by, created_at, updated_at, archived_at
studio_items        id, organization_id, project_id, kind, x, y, w, h, z, label,
                    current_version_id, created_at, updated_at
studio_item_versions id, organization_id, item_id, parent_version_id, media_asset_id?,
                    text?, params_json, source ('user'|'agent'|'generation'), run_id?, created_at
studio_edges        id, organization_id, project_id, from_item_id, to_item_id
studio_runs         id, organization_id, project_id, thread_id, status, cost_credits, created_at
studio_generations  id, organization_id, run_id, provider, model, status, cost_credits,
                    failure_reason, request_ref, created_at, updated_at
```

All tenant tables are scoped by `organization_id` with indexes that start with it. No `undefined` binds, ≤100 params, no transactions (`db.batch`). Never edit an applied migration.

## 9. API and MCP

REST under `/api/v1/studio/projects/...` (list, create, rename, archive; items, versions, edges; runs). Cursor pagination, camelCase, prefixed IDs (`stp_`, `sti_`, `stv_`, `str_`). The live chat connects to the project's Durable Object over WebSocket after the Worker checks the session and workspace membership. Every endpoint needs a cross-workspace isolation test.

MCP: one tool per Studio service so an outside agent has parity. The tool count and names are decided when the services exist.

## 10. Frontend structure

```
apps/web/src/features/studio/
  api.ts                       TanStack Query hooks (projects, items) + live state hook
  lib.ts                       layout, hit-testing, drag payload types
  components/
    studio-workspace.tsx       split layout, resize, collapse
    chat/                      message list, step list, composer, attachment chips
    canvas/                    viewport (pan/zoom), item renderers, edges, selection, assets drawer
apps/web/src/routes/_authed/studio.tsx, studio.$projectId.tsx
```

- All strings in `@sns/i18n` (`studio.*`) in en/ko/fr.
- **Open (§19 of the conventions): canvas library.** Options are a node-graph library (e.g. React Flow) or our own pan/zoom surface with absolutely-positioned items. A new dependency has to pass the §19 checklist (maintained, licence, bundle size). v1 only needs pan, zoom, drag, select and straight edges, so a small custom surface may be enough. Decide after a spike.
- Drag and drop uses native HTML5 events plus pointer events for in-canvas movement, with a keyboard path (§4).
- Chat and canvas state come from the project's live state, not a separate client store.

## 11. Phases

| Phase | Content | Needs |
| :-- | :-- | :-- |
| **0** | Static mock on localhost (chat + canvas + drag and drop, fake data) to eyeball layout. No backend. | Owner approval |
| **1** | Persistent projects and items, manual canvas (notes, assets from Media, drag and drop, versions). No agent. | D1 migration |
| **2** | Agent chat with text-only tools: describe media, write captions, draft `post` items from selected assets. No generation cost. | Durable Object binding, `PLAN.md` update |
| **3** | Generation providers, jobs, credit limit, approvals. | Provider decision, new limit key |
| **4** | Sandbox tool for editing (trim, crop, concat). | Sandbox decision (§7) |
| **5** | Agent edits existing canvas items, MCP parity, project templates. | |

Phase 0 and 1 don't need any new Cloudflare binding. Phase 2 does.

## 12. Reference (read before judging this design)

What the competitors' official docs say, with only documented facts:

- **Higgsfield:** Canvas is a node board (prompt, generation, reference, audio nodes), autosaves, saves a workflow as a template, building nodes is free and credits are charged per generation. Supercomputer is a separate chat agent: proposes a plan, runs the steps, returns results in the same chat, re-runs only what changed when you reply, keeps Memory between chats, outputs land in Assets, exposes an MCP connector. Not documented: agent tool names, retention, whether the Canvas agent edits existing nodes.
- **Dreamina:** one infinite canvas is the project (no separate project object). Octo chat opens with "/", reads the canvas layout, plans script, scenes and shots, and edits on request. Edits create new versions and keep the originals. Limits: subject nodes can't leave their canvas, search is per canvas, one timeline, no real-time teamwork. Agent control of nodes through a CLI is worded as future. Not documented: chat history, memory, retention, undo.
- **Cloudflare:** Agents SDK and Sandbox docs as summarised in §5 and §7.

Sources: higgsfield.ai help centre (Canvas, Supercomputer, MCP), higgsfield.ai blog "How we built Supercomputer", dreamina.capcut.com (AI Canvas review, AI Canvas, AI video agent), developers.cloudflare.com (agents/runtime/capabilities/sessions, state; agents/agent-class/internals; sandbox overview, lifetime, files, concepts/containers, concepts/security; containers/platform/limits).

## 13. Risks and review constraints

- **Platform review.** Posts and its composer stay untouched. Studio never publishes by itself, and the Media and post flows reviewers see are unchanged. Mark the page as a preview until reviewers have passed.
- **Privacy policy.** Sending prompts and media to a generation provider is a new disclosure (sharing with a processor). Update en/ko/fr before launch. Legal text, owner approves.
- **Cost exposure** is the biggest risk (§5 hard rules).
- **Beta dependencies:** Agents `Sessions` (experimental), sandbox scheduling and snapshots (public beta). Isolate them behind our own interfaces so they can be swapped.
- **Storage.** Generated assets count against the plan's storage limit, so a heavy session can fill it. The agent must handle the `forbidden` storage error gracefully.

## 14. Tests required (when built)

- Cross-workspace isolation for every Studio endpoint and for the DO connection.
- A fixed-clock test for every time rule (run timeouts, stale generation jobs).
- Limit tests at, below and above the credit limit, with `MONETIZATION_ENABLED` both `true` and `false`.
- The agent cannot publish or schedule: a test that the tool layer rejects it even when the model asks.
- Account deletion removes Studio rows, DO data and generated R2 files.
- Provider adapters against fixtures only.

## 15. Open questions for the owner

1. Approve Phase 0 (static mock on localhost)?
2. Generation provider and models (§6)?
3. Per-run approval threshold and the plan credit limits?
4. Cloudflare Agents SDK on a Durable Object, accepting the experimental `Sessions`, or our own simpler chat store first?
5. Sandbox: in scope for v1, or later?
6. Canvas library vs. our own surface (decide after a spike)?
