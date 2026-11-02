# Shotprint: submission draft

Draft for the Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026). Not published yet.

## Basics

| Field | Value |
|---|---|
| Project | Shotprint |
| Tagline | Any video. Directed by an agent. |
| Track | Startups |
| Problem statement | Build for Your World |
| Repository | https://github.com/treksis/Shotprint |
| Demo video | _link to add_ |
| Team | _names to add_ |

## One-liner

Shotprint is the agent-native video studio: Muse Code directs every production in its own cloud sandbox,
following playbooks measured from videos that already work, and delivers a finished spot you can steer
while it is made.

## The problem

Video sits at the center of the largest media markets (advertising $1.34T, film and TV content $255B,
the creator economy roughly $250B+ in 2026), and almost all of it is still made by hand. A professional
30-second spot costs $5k to over $1M to produce. AI video tools give you clips, not productions: the
hundreds of decisions about shots, timing, framing, light and sound are left to you.

Code just showed what happens next. AI's share of new code at one large tech company went from about 25%
to 75% in 18 months. Video is the next craft to go agent-native.

## What it does

1. **Pick a playbook**: a proven format measured shot by shot from a video that already works (timing,
   framing, lens, camera move, light, text, sound), with a storyboard per shot and swappable assets.
2. **Brief it**: your product and one sentence.
3. **Muse Code directs**: in a private cloud sandbox it plans the film, draws every still with Muse Image,
   renders the shots, checks continuity and lip sync, re-renders takes that drift, and cuts the 30 s and
   15 s versions on the beat. Every file lands on a live canvas; you can steer or queue changes mid-run.
4. **Verified playbooks**: each playbook is checked by having the agent rebuild the original without seeing
   it, then comparing the two side by side. Only playbooks that match ship.

Agent-native production brings a top-tier 30-second spot to under $200.

## How we use Meta's models

| Role | Model | What it does |
|---|---|---|
| Director | Muse Code | One session per project in a sandbox, driven over its own protocol: send, steer, queue, interrupt, resume, subagents |
| Think | Muse Spark · Muse Wonder | Reasoning and direction (Demo and Live modes) |
| Draw | Muse Image | Plates, cast and product sheets, storyboards |
| Listen | Muse Voice Transcribe | Measures every spoken line when a video is turned into a playbook |
| Shoot | Video generation API | Model-agnostic; today fal.ai with MiniMax H3 (open weights), ready for a Muse video API |

## How we built it

- **Studio**: React chat plus a live canvas built from the agent's own files, wired by how each was made
  (plan → still → render → cut).
- **Sandbox runtime**: one container per project running Muse Code, with spend caps and Demo/Live modes.
- **Measuring kit**: turns a reference video into shot boards, cuts, loudness and lines in about 17 seconds.
- **Playbook format**: 30 s and 15 s cuts, storyboards, assets and measured shot data.
- **Verification loop**: blind rebuild, side-by-side comparison, ship only what matches.

## Challenges

Today's video models have four known limits, and we engineered around each one:

| Limit | What breaks | Our fix |
|---|---|---|
| Spatial reading | Misreads framing, depth and screen direction | Framing, lens and move written as numbers for every shot |
| Consistency | Faces, products and light drift between shots | One plate per camera setup as the first frame; a locked product sheet |
| Audio sync | Voices drift and lip sync breaks | Voice take first, video rendered to it; audio never retimed |
| Angle diversity | Falls back to the same safe framings | Measured angle and move enforced shot by shot |

## What's next

Ads and short-form first, where adoption is fastest; brand and business video (product, explainers,
corporate, education) is already following; long-form entertainment after that. Same studio, same agent,
same playbook format: each new format adds playbooks, not a new product.

## Built during the hackathon

Everything in this repository was built during the event: the Studio, the Muse Code sandbox runtime and
protocol driver, the canvas, the measuring kit, the playbook format, the verification loop, and the example
playbooks and films. Pre-existing: the GPU setup that renders video clips.

## Notes before publishing

- Example playbooks are measured from existing ads for demonstration; third-party footage and audio stay out
  of the repository, cast are invented, and brands are slots.
- Market figures: WARC Global Ad Forecast (Q3 2026), Ampere Analysis (Jan 2026), research-firm ranges for
  the creator economy and production services; production costs from 2026 pricing guides (directional).
