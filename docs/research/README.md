# Studio research: agent + canvas workspaces

Brought over 2026-10-30 from the Pikvato (`sns-management`) session where the Studio idea was first
researched by mistake. Everything here was read from official vendor pages on 2026-10-31 UTC
(Pikvato session `ad1516c0`), verbatim; nothing was re-researched.

| File | What it covers |
|---|---|
| [dreamina.md](dreamina.md) | Dreamina (CapCut) AI Canvas / Spaces and the Octo agent: node types, how the agent plans and edits the canvas, what persists, import/export, credit plans (CAD), limits. 6 official pages. |
| [higgsfield.md](higgsfield.md) | Higgsfield Canvas and Supercomputer: nodes, agent plan → run → refine loop, Memory, Projects, Skills, Connectors, MCP/CLI surface, credits, limits. 10 official pages. |
| [cloudflare-sandbox-agents.md](cloudflare-sandbox-agents.md) | Cloudflare Agents SDK (Durable Object per agent, state sync, Sessions) and Sandbox (microVM per instance, ephemeral disk, snapshots beta, API versions). 12 official pages. Relevant because this project already depends on `@cloudflare/sandbox`. |
| [search-log-and-first-summary.md](search-log-and-first-summary.md) | Your original requests, the raw web searches (incl. Flora, Krea, Weavy/Figma Weave, Lovart), and the first comparison summary written from them. |

The Studio spec and mock that came out of this research are in [`../studio/`](../studio/)
(`HANDOFF.md`, `spec-studio.md`, `mock-source/`, English strings only).

## The pattern all of them share

- **One persistent canvas is the project.** Prompts, references, generations and versions stay on it
  (Dreamina: edits create new versions, originals stay; Higgsfield: autosave, save-as-template).
- **An agent works on that canvas from a chat.** It reads the canvas, plans steps, picks models,
  runs generations, and re-runs only what changed when you refine (Higgsfield Supercomputer; Dreamina
  Octo opened with "/").
- **Assets flow in by drag and drop or an asset library**, and out as files (Dreamina also exports
  MP4, XML and an editable timeline draft).
- **Spending is the weak spot.** Higgsfield calls the "approve before spending" step "a prompt-level
  instruction, not a hard limit"; there's "no native credit cap" for agents.

## Not covered yet

- Dreamina's chat history, memory, retention and node limits are not stated on any page read.
- Higgsfield's tool/API schemas and retention periods are not stated.
- Cloudflare Sandbox pricing page was not read.
- Flora, Krea, Weavy and Lovart were only seen through search results and third-party reviews.
