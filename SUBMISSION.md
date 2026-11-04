# Shotprint: submission

Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026).

## Basics

| Field | Value |
|---|---|
| Project | Shotprint |
| Tagline | The video template marketplace for AI agents. |
| Track | Startups |
| Problem statement | Build for Your World |
| Repository | https://github.com/treksis/Shotprint |
| Live demo | https://shotprint.hosung-jang.workers.dev (Live mode passcode in the submission notes) |
| Demo video | _link to add_ |
| Team | _names to add_ |

## One-liner

Shotprint is the video template marketplace for AI agents: templates written for an agent to run, not a
project file for a person to edit. Any agent licenses a template with its fill recipe and runs it with the
video model it already uses; in the Studio, Muse Code does it in its own microVM while you steer.

## The problem

Video sits at the center of the largest media markets (advertising $1.34T, film and TV content $255B,
the creator economy roughly $250B+ in 2026), and almost all of it is still made by hand. A professional
30-second spot costs $5k to over $1M to produce.

Stock template marketplaces made video cheaper for people, but a stock template is still a timeline
someone has to open and edit for hours. Agents can't use it. AI video tools go the other way: they give
you clips, and leave the hundreds of decisions about shots, timing, framing, light and sound to you.

Code just showed what happens next. AI's share of new code at one large tech company went from about 25%
to 75% in 18 months. Video is the next craft to go agent-native, and agents need formats they can run.

## What it does

A buyer gets the template package and its fill recipe; any agent can run it with its own video model. The
Studio is the reference implementation:

1. **Marketplace**: templates classified by goal (product launch, brand story, comedy, explainer,
   seasonal), industry, tone and cast. Each one is measured shot by shot from a video that already works
   (timing, framing, lens, camera move, light, text, sound), with a storyboard per shot and swappable
   cast, product and places.
2. **Make a video** (the reference agent): pick a template, add your product and one sentence. Muse Code, in its own microVM,
   plans the film, draws every still with Muse Image, renders the shots, checks continuity and lip sync,
   re-renders takes that drift, and cuts the 30 s and 15 s versions on the beat. Every file lands on a
   live canvas; you can steer or queue changes mid-run.
3. **Build a template**: upload your own reference. In its own microVM the agent measures it, writes the
   template, and benchmarks it: it remakes the reference from the template alone and shows the two side
   by side. Keep it private to your workspace, or list it on the marketplace.

Agent-native production brings a top-tier 30-second spot to under $200.

## Business model

Two-sided: template creators (directors, motion designers, agencies) list templates; brands, agencies and
their agents license them. Creators earn on every license and Shotprint takes a share. We sell the
directing knowledge, not rendering: a template plus its fill recipe (the `template-fill` skill) works with
any agent and any video model, so there is no video API to resell and no GPU margin to defend. Managed
rendering in the Studio is optional, and it is how every listing is benchmarked before buyers see it.

## How we use Meta's models

| Role | Model | What it does |
|---|---|---|
| Director | Muse Code | One session per project in a microVM, driven over its own protocol: send, steer, queue, interrupt, resume, subagents |
| Think | Muse Spark · Muse Wonder | Reasoning and direction (Demo and Live modes) |
| Draw | Muse Image | Plates, cast and product sheets, storyboards |
| Listen | Muse Voice Transcribe | Measures every spoken line when a video is turned into a template |
| Shoot | Video generation API | Model-agnostic; today fal.ai with MiniMax H3 (open weights), ready for a Muse video API |

## How we built it

- **Studio**: React marketplace with search and filters, the Build a template flow, and the production
  view: chat plus a live canvas built from the agent's own files, wired by how each was made
  (plan → still → render → cut).
- **Sandbox runtime**: one microVM per project and per template build: Apple's `container` runtime
  locally (each container its own lightweight VM), Cloudflare Containers in the live demo (a Worker with
  D1 and R2 in front), with CPU, memory and spend caps and Demo/Live modes. Muse Code runs inside behind a small relay that logs
  every protocol event, so turns survive server restarts.
- **Measuring kit** (`bin/dissect`, `tools/motion.py`): turns a reference video into shot boards, cuts,
  camera moves from optical flow, loudness and lines in about 30 seconds, with no model calls.
- **Template format**: `TEMPLATE.md` plus `template.json` (every shot's numbers), 30 s and 15 s cuts with
  their score, a board per shot, the asset set, and a marketplace listing (`catalog.json`).
  `bin/template check` validates it.
- **Benchmark**: remake from the template alone, side-by-side comparison.

## Challenges

Today's video models have four known limits, and we engineered around each one:

| Limit | What breaks | Our fix |
|---|---|---|
| Spatial reading | Misreads framing, depth and screen direction | Framing, lens and move written as numbers for every shot |
| Consistency | Faces, products and light drift between shots | One plate per camera setup as the first frame; a locked product sheet |
| Audio sync | Voices drift and lip sync breaks | Voice take first, video rendered to it; audio never retimed |
| Angle diversity | Falls back to the same safe framings | Measured angle and move enforced shot by shot |

## What's next

Open the marketplace to outside creators with revenue share, starting with ads and short-form, where
adoption is fastest; brand and business video (product, explainers, corporate, education) next;
long-form entertainment after that. Each new format adds templates, not a new product.

## Built during the hackathon

Everything in this repository was built during the event: the Studio and marketplace, the microVM
sandbox runtime and protocol driver, the canvas, the measuring kit, the template format, the benchmark,
and the example templates and films. Pre-existing: the GPU setup that renders video clips.

## Notes

- Example templates are measured from existing ads for demonstration; third-party footage and audio stay
  out of the repository and behind the passcode in the demo. Cast are invented, and brands are slots.
- Market figures: WARC Global Ad Forecast (Q3 2026), Ampere Analysis (Jan 2026), research-firm ranges for
  the creator economy and production services; production costs from 2026 pricing guides (directional).
