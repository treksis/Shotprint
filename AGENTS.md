# AGENTS.md

Guide for coding agents working on this repo. (`sandbox/kit/AGENTS.md` is a different file: the
instructions for Muse Code inside a project VM.)

## Layout

- `src/client`: React + Vite Studio, shadcn/ui, Tailwind v4.
- `src/shared`: types and the template catalog (`studio-templates.ts`).
- `src/worker`: Hono API.
  - `dev-server.ts`: Node, local.
  - `cf-entry.ts`: Cloudflare Worker.
  - `vm-server.ts`: runs inside each project's container.
- `src/worker/sandbox`: the session runtime. `docker.ts` picks `container`, `docker` or `local`.
- `sandbox/`: what goes into a project VM: `kit`, `templates`, `seeds`, `host`.

## Commands

```bash
npm run dev            # local Studio on :5180 (API on :8788)
npx tsc --noEmit -p .  # typecheck
npm run cf:deploy      # build, pack, deploy to Cloudflare
```

## Rules

- Never commit secrets: `.env` and `.dev.vars` are ignored. Read keys from env.
- Third-party footage and audio stay local. Committed templates use invented cast and drawn storyboards.
- Keep diffs small and in the style of the surrounding code. Don't run prettier over the repo.
- Deploying a changed VM image restarts running project VMs and loses their in-progress work.
- Spend guard on Cloudflare: caps are `vars` in `wrangler.jsonc`, and `STUDIO_PAUSED` is the kill switch.
- Wording in the UI: say "template" (never "playbook") and "benchmarked" (never "verified").
