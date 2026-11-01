# Studio: state and next steps (written 2026-10-31, 01:45; updated 2026-11-01)

Read with `SPEC.md` §0 (architecture). Everything below was verified on a live run unless it says otherwise.

## Pick up here (stopped 2026-11-01 15:00, token budget)

Done:
- 13 templates seeded in the Studio, each with blind 30 s + 15 s proofs: 4 Meta/own + 9 third-party ads.
  athlete-anthem was recast (invented presenter) and rebuilt.
- 10 Meta product films as template examples (30 s + 15 s): Ray-Ban Display, Quest 3S, Ray-Ban Meta fans,
  Marketplace, WhatsApp, Meta AI, Meta AI app, Ray-Ban Meta gift, Quest 3, Threads.
  Reel: `lab/pitch/meta_products_reel.mp4` (43 s, local).
- Pitch deck (private artifact https://claude.ai/artifact/8A9xeZLANTcsS6cBgEKeBN), `docs/pitch/README.md`,
  `lab/pitch/RUN.md` updated. Everything committed locally, nothing pushed.
- No GPU running: the Colab G4 went away at ~06:40; `colab sessions` shows none, 539.78 units left.
  Dev server stopped.

Next:
1. Finish travel-escape, new-home, telenovela-glam (templates authored, `bin/template check` OK, in
   `lab/replicate/author-<id>`). Their blind rebuilds in `replica30-<id>` / `replica15-<id>` are stills
   only. Start a G4 (`colab-gpu` skill, `h3_bootstrap.sh G4 h3 --keep`), clear each replica's
   `.h3_ledger.jsonl`, re-run its `jobs/*.jsonl` with `bin/h3`, rebuild `final/final.mp4` with the
   workspace's own build script (named in its notes/replication_report.md), then
   `compare/sbs.sh` -> review -> `python3 docs/pitch/publish_template.py <id>` ->
   `python3 docs/pitch/add_to_catalog.py lab/pitch/catalog/<id>.json` -> commit. travel-escape's line
   clips have the default names muted; check the rebuild voiced them.
2. Done 2026-11-01 evening: the Meta product films and the reel carry original synthesized music
   (`docs/pitch/own_score.py`, see docs/pitch/README.md); fan-moments' default drink is now a tangerine
   can (#D46D28, product sheets hue-shifted, end card redrawn). Its proof video still shows the red can.
3. Studio open item below (show "working in the background" after `turn/foregroundCompleted`).
4. Muse later, once the Opus flow is the reference.

## 2026-11-01: templates make 30 s and 15 s spots

Templates are now **short-spot recipes**: a real ad is measured whole, but only a 30 s and a 15 s cut are
made (`cut30`, `cut15`). Video models hold a shot for 2-10 s and stay consistent across 10-15 shots, not
across a long film; full-length blind rebuilds broke on voice pace and continuity, 30 s and 15 s rebuilds
came out close shot for shot.

- Format: `sandbox/kit/docs/template_spec.md` (recipe, ingredient set, storyboards, cuts, lines/ + ui_
  sheets, numbers not adjectives). Authoring: `make-template` skill + `bin/template` (beats, score,
  reference, check). Filling: `template-fill` skill (cut30 by default, cut15 on request).
- Library: `sandbox/templates/<id>`, seeded with `sandbox/host/seed_template.py` (normalizes the cut
  schema, PNG -> JPEG, runs `bin/template check`). Source audio (score, lines) is gitignored.
- Proof: every seeded template was rebuilt **blind** (an Opus agent with only the template) at 30 s and
  15 s; `public/templates/proof/<id>-{30,15}.mp4` (local only) is the real footage cut the same way next
  to the rebuild. The Studio's template page plays it, with the cut as a storyboard strip, its lines and
  the ingredient set (`/api/studio/templates/:id`, `/files/*`).
- Authoring and rebuilding were done by Opus in `lab/replicate/` (author-*, replica30-*, replica15-*,
  compare30/, compare15/). Muse comes later, once the Opus flow is the reference.

| Template (30 s blind rebuild) | Clips | Time |
|---|---|---|
| Meta launch film | 11 | 25 min |
| BlueChip founder story | 11 | 16 min |
| Muse intro (motion graphics, drawn in code) | 2 | 12 min |
| Muse tour (presenter + screens) | 5 | 9 min |

Overnight (2026-11-01, 01:00-07:00) the library grew to 13 seeded templates (see
`docs/pitch/README.md`): nine popular third-party ads (phone reveal, heritage farm story, animal epic,
soft-drink fan spot, room makeover, deadpan dialogue, holiday story, car launch, athlete monologue), each
authored by Opus and rebuilt blind at 30 s and 15 s. Three more were authored (travel-escape, new-home,
telenovela-glam in `lab/replicate/author-*`) but not seeded: the Colab G4 went away at ~06:40, so their
blind rebuilds are stills only. Re-run their `jobs/*.jsonl` on a new box, rebuild, then publish.
Ten Meta product films were made from the templates as examples (`public/templates/examples/`, local
only; original synthesized music since 2026-11-01 evening). Lessons:
- Rebuild agents sometimes end their turn while `bin/h3` renders are still queued; the clips finish on the
  box. Recover with `bin/h3 resume` in the workspace, then hand the assembly to a fresh agent (the
  workspace's notes/ and work/ scripts carry the plan).
- Check invented cast against the source's real people: a stack of signature traits (hair, cap, glasses,
  team colours) is a likeness even when the face differs. athlete-anthem was recast and rebuilt for this.
- Every slot needs a concrete default (spec updated), or a rebuild guesses a brand name.

Open, Studio side: on `turn/foregroundCompleted` the turn keeps running while subagents work (28 min in
the dissect seed), so "running" is true but reads as stuck: show "working in the background".

## Where we are

The Studio is a front end for **Muse Code**. Each project has its own Docker sandbox running `muse serve`
behind `sandbox/host/relay.mjs`. The chat is the MSP item stream; send, steer, queue and stop map to
Muse Code's own commands. The canvas is the workspace folder, wired by the agent's own records.

Three recorded sessions are the sample projects (`sandbox/seeds/`; workspaces are local only, gitignored):

| Seed | What it shows | Cost |
|---|---|---|
| `01-meta-vr-glasses-bluechip` | 30.4 s film from the BlueChip template: 6 Ref2V presenter takes + 7 FL2V B-roll shots, 15-shot cut with score, overlay and L/J-cuts. Interrupted and resumed twice. | ~$10 (Wonder, then Spark) |
| `02-render-modes-teaser` | 12 s teaser, one shot per mode: T2V, FL2V (first + last plate), Ref2V (presenter + voice). Muse re-rendered a take with an artifact on its own. | ~$0.10 (Spark) |
| `03-dissect-meta-launch` | Meta's 86 s launch film dissected into `templates/meta-launch/` (28 shots, 5 acts, camera, sound, text) with parallel subagents. | $0.58 (Spark) |

Commits on 2026-10-31: `56ac4b4` (v1 pipeline removed) through `ea2bcdb`.

## Problem 1: dissection speed — solved 2026-10-31 (`8fa1490`)

`bin/dissect` (kit) measures a film in ~17 s with no model: one decode to a 384 px all-intra proxy, adaptive
scene-score cuts + grey-diff gradual transitions, black, silences, loudness, Muse transcript, labelled shot
boards (start/mid/end per shot), contact sheets, key frames, `--template` skeleton. AGENTS.md: run it, read
boards, one pass, no subagents under ~2 min, parallel shell for independent work. Reviewed by Opus (5 bugs
fixed: unsafe stems, audio-length duration, VFR frames, template rerun merge, stale outputs; 2x faster).

| Run (Meta launch film, 86 s, Spark) | Wall | Cost | Shots |
|---|---|---|---|
| Before (subagents, frame by frame) | ~73 min | $0.58 | 28 |
| Bench 1 (`stp_mvwwxe0r60una`) | 3m56s | ~$0.10 | 29 (all 28 + a UI dissolve Muse confirmed) |
| Bench 2 (`stp_mvwyfyl1l9nuj`, faster tool) | 3m54s | $0.11 | 29, 8 acts, no empty fields |

Now ~90% of the time is Spark writing (~22k output tokens: template.json fill, TEMPLATE.md, master_shots.md).
Next levers if needed: fewer/shorter documents (master_shots.md overlaps TEMPLATE.md), or split the writing
by act across subagents for long films. Container is capped at 2 CPUs (`STUDIO_SANDBOX_CPUS`).

### Original notes (before the fix)

The dissection seed took **about 75 minutes**. A dissection should take a few minutes.

Where the time went:
1. **Frame-by-frame review.** Three Spark subagents extracted 230 single frames to `/tmp` and read them one
   `read_file` at a time: one model call per frame, per agent.
2. **Subagents waiting on approvals nobody answered** (~40 min). Child sessions don't inherit
   `approvalMode: allowAll`; their shell commands asked for approval and hung. Fixed in `75a133c`
   (runtime auto-approves), but it cost this run most of its time.
3. **The parent sat in `subagent_wait` loops** (5-minute timeouts) instead of working, and a steer only
   lands when such a wait returns.
4. **No native video.** MSP accepts a video part (`media/upload`), but Muse Spark and Muse Wonder both
   answer "video omitted: the selected model does not support video input". So Muse can only see video
   through frames.

What already changed: `AGENTS.md` now says to read timestamped contact sheets (20 frames per image,
4-5 images for a 90 s film) and never frames one by one. A test sheet showed every cut clearly.

Ideas to make it fast (to discuss):
- **A dissect tool instead of agent improvisation.** `bin/dissect inputs/x.mp4` does the mechanical part
  in seconds with no model: scene cuts (+ the diff-curve check Muse invented), one still per shot,
  contact sheets, loudness/silence map, a transcript if we have speech-to-text. Muse then reads ~5 sheets
  and writes TEMPLATE.md. Expected: 2-5 minutes, a few cents.
- **One pass, no subagents** for films under ~2 minutes; subagents only for long films, and each gets its
  own time range rather than its own "aspect" (cuts / camera / sound all need the same frames).
- **Per-shot strips** (start / middle / end of each shot in one image) for camera-move reading, instead of
  1 fps sheets.
- **Speech-to-text** for lines (Muse Voice Transcribe, or Whisper in the sandbox); Muse noted it could not
  verify spoken words.
- **A time budget in the brief** ("finish within 5 minutes") and a progress note the canvas shows.
- Measure: target under 5 minutes and under $0.20 on Spark for an 86 s film.

## Problem 2: things the stress test found (fixed or open)

Fixed today:
- A server restart cancelled the running turn (`session/resume` on a warm relay = crash recovery).
- The spend cap read its env too early and Muse Wonder had no price (reported $0.05 for ~$10).
- Chat layout broke (AI Elements `MessageResponse` was `size-full`); tool rows lost their arguments
  (MSP sends `args` as a JSON string).
- Spark answered in Korean once; `AGENTS.md` now requires English.
- Canvas reads `tools/assemble.py` cut lists (sound, overlay, score edges) and contact sheets.

Open:
- **Subagents' own work is invisible** in the chat: child sessions' items aren't in our log (only the
  subagent card with its objective). Option: `view/subscribe` to child sessions in the relay.
- The page kept showing "running" after a turn had completed during subagent waits; check status folding
  around `turn/foregroundCompleted`.
- A send error (spend cap) didn't show in the composer; check `sendError` rendering.
- Muse ends a turn while a render runs in the background and resumes by itself when it finishes; the UI
  says idle in between. Show "waiting on renders" from `.bridge` state.
- Cloudflare implementation of `StudioSandbox` is still not built (deploy answers 503).

## Running costs to watch

- **Colab G4 `h3`** (`gpu-g4-s-euw4a0-3ih6pku5onwf0`, ~10 compute units/h) renders every H3 clip for the
  lab runs; kept up per the standing policy. A second, unnamed G4 (`[?] gpu-g4-s-euw4a2-…`) shows up in
  `colab sessions` with a new id each time it is checked; nothing in this repo starts it. If it isn't
  yours elsewhere, close it at colab.research.google.com → Runtime → Manage sessions. Before any ssh:
  `colab sessions` (ssh to a name it doesn't list silently starts a billed CPU box).
- Project containers (`museclone-*`) idle on `sleep`; harmless, removed when a project is deleted.
- `.dev.vars` has `H3_ENABLED=1` and `STUDIO_USD_CAP=25` for these runs.
