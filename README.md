# Shotprint

The video template marketplace for AI agents. A Shotprint template is written for an agent to run, not a
project file for a person to edit: pick one, write one sentence, and Muse Code makes the 30 s and 15 s spots.
Anyone can turn a video that works into a template, keep it private or list it.

Meta Global AI Developer Hackathon · Startups track · Build for Your World

## Meta models

| Model | Role |
|---|---|
| Muse Code | The production agent. One microVM per project and per template build. |
| Muse Spark · Muse Wonder | Its models (Demo · Live). |
| Muse Image | Plates, cast and product sheets, storyboards. |
| Muse Voice Transcribe | Measures the spoken lines of an ad. |

<sub>Video: MiniMax-H3 (open weights) on our GPU. Other agent providers can be plugged in later.</sub>

## How it works

1. **Marketplace.** Templates filtered by goal, industry, tone and cast, each benchmarked.
2. **Produce.** Pick one, add your product and one sentence. Muse Code directs in its own microVM; every
   file lands on a live canvas you can steer.
3. **Build a template.** Upload a reference. In its own microVM the agent measures it (cuts, camera moves,
   loudness, lines; no model, ~30 s), writes each shot's framing, camera, light, text and sound as numbers
   with swappable assets and a storyboard per shot, cuts it to 30 s and 15 s, and benchmarks it: the
   reference is remade from the template alone and compared side by side. Keep it private or list it.

```mermaid
flowchart LR
  UI[Studio] --> API[API]
  API --> R[relay]
  subgraph microVM per project
    R --> MC[Muse Code] --> KIT[kit tools]
  end
  MC --> META[Meta Model API]
  KIT --> META
  KIT --> H3[H3 GPU]
```

## Run

```bash
npm install
cp .env.example .env      # META_API_KEY
npm run sandbox:image     # Docker; or sandbox:image:vm for Apple's container (macOS 26)
npm run dev               # http://localhost:5180
```

Sandboxes: on a Mac with Apple's `container` installed, each project runs in its own lightweight VM
(own kernel, CPU and memory caps); otherwise a Docker container. `STUDIO_SANDBOX_RUNTIME=docker|container`
overrides. Production runs on Cloudflare's sandbox product behind the same interface
(`src/worker/studio/sandbox.ts`).

## Notes

- Built during the hackathon (Oct 26 – Nov 4, 2026). The H3 GPU setup it calls predates the event.
- Third-party ads and their audio stay out of this repo. Cast are invented, brands are slots, music is
  original.

## Map

`src/client` UI · `src/worker` API and sandbox runtime · `sandbox/kit` agent tools · `sandbox/templates`
templates · `sandbox/seeds` recorded sessions · `docs/pitch` publishing scripts
