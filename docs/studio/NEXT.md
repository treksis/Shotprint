# Studio: state and next steps (written 2026-10-31, 01:45)

Read with `SPEC.md` §0 (architecture). Everything below was verified on a live run unless it says otherwise.

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

## Problem 1 (tomorrow's first topic): dissection is far too slow

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

- Colab G4 `h3` is **up** (started 2026-10-31 00:09, ~10 compute units/h). Stop with
  `cd ~/Documents/infocaton-template && tools/colab/mac/colab stop -s h3`.
- An **orphan G4** (`[?] gpu-g4-s-…`, not created by the CLI) also bills ~10 units/h; the CLI can't stop
  it. Close it at colab.research.google.com → Runtime → Manage sessions.
- Project containers (`museclone-*`) idle on `sleep`; harmless, removed when a project is deleted.
- `.dev.vars` has `H3_ENABLED=1` and `STUDIO_USD_CAP=25` for these runs.
