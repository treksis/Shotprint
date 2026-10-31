# Studio handoff (extracted from the Pikvato repo)

Written 2026-10-30. This was started in the Pikvato repo (`sns-management`) by mistake and has been removed from it. Nothing from Studio was ever pushed, merged or deployed.

## What this is

A "Studio" page: agent chat on the left, persistent canvas on the right (like Claude with Artifacts), app sidebar kept on the left. Drag and drop for assets. Inspired by Dreamina's AI Canvas and Higgsfield's Canvas and Supercomputer. Agent code execution would run in a Cloudflare Sandbox microVM.

## Files in this folder

| File | What |
| :-- | :-- |
| `spec-studio.pikvato.md` | (superseded by `SPEC.md`) Original draft spec: layout, concepts, drag and drop table, agent rules, sandbox facts, data model, phases, risks, tests, open questions. Written for the Pikvato stack (Cloudflare Workers, D1, R2, Hono, TanStack, `@sns/ui`), so adapt the stack-specific parts. |
| `mock-source/features-studio/` | Phase 0 mock: `types.ts`, `lib.ts`, `components/{studio-workspace,chat-panel,canvas-panel,assets-drawer,item-card}.tsx`. React 19, in-memory, no backend. |
| `mock-source/route-studio.tsx` | TanStack Router file route (`/_authed/studio`) that mounts the workspace. |
| `mock-source/i18n-{en,ko,fr}.json` | The `studio.*` strings and `nav.studio`. |

## What the mock does (verified in a browser, 2026-10-30)

- Resizable chat/canvas split (width kept in `localStorage`), tabs below `lg`.
- Fake agent run: five steps with a credit cost, Stop button, then adds a prompt note, an image and a post draft joined by lines. Chips in the chat select and centre canvas items.
- Canvas: pan, Ctrl+scroll zoom, zoom buttons, fit, drag items, Delete removes from the canvas only, "Ask about this" attaches an item to the chat.
- Assets drawer showing the Media library (click to add).
- **Not verified:** real HTML5 drag and drop (library image → canvas/chat, desktop file → canvas/chat, item → composer). The browser automation can't produce drag events. Test by hand.
- Nothing is saved. "Generated" images are existing library files.

## Dependencies the mock assumes (Pikvato-specific, replace as needed)

`@sns/ui` (Button, PlatformIcon, cn), `use-intl` via a `useT("studio")` hook, `useMediaLibraryQuery` and `MediaThumb` from the Media feature, Tailwind v4 tokens (`bg-rail`, `bg-soft`, `bg-field`, `border-hairline`, `text-muted-foreground`, `--color-hairline`). No new npm packages.

## Research that fed the spec (official docs only)

- Higgsfield: Canvas is a node board that autosaves and can be saved as a template; Supercomputer is a separate chat agent with Memory, Skills and Connectors, plus an MCP connector. Their own docs call the spending-approval step "a prompt-level instruction, not a hard limit."
- Dreamina: one infinite canvas is the project, Octo chat opens with "/", edits create versions, subject nodes can't leave their canvas.
- Cloudflare: Agents SDK (Durable Object per agent, state sync over WebSocket, `Sessions` is experimental) and Sandbox (microVM per instance, disk is deleted when it stops, snapshots in public beta, Workers Paid plan, two API versions 0.x and 1.0). Sandbox pricing page was not read.

## Decisions still open (spec §15)

1. Approve Phase 0.
2. Generation provider and models.
3. Per-run approval threshold and credit limits.
4. Agents SDK `Sessions` (experimental) vs. a simple chat store first.
5. Sandbox in v1 or later.
6. Canvas library vs. a custom pan/zoom surface.

## Next step

Port `mock-source` into the correct project, adjust imports and strings, and check it in a browser. Phase 1 is persistence (projects and items in a database, no agent yet).

## State of the Pikvato repo after removal

- `main` is clean and equal to `origin/main` at `2b38d82` (calendar changes, deployed). Only the untracked `.claude/launch.json` remains.
- The local branch `feat/studio-mock` (commit `031db66`) was deleted. It was never pushed. The commit stays recoverable from the git reflog for a while (`git branch feat/studio-mock 031db66`).
- Local dev DB still has the calendar test data from earlier (`post_viral*` rows and four fake connected accounts, `ca_viral_*`). It is local only and harmless, and can be deleted if wanted.
