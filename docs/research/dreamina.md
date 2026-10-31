# Read Dreamina official docs

Extracted 2026-10-30 from the Pikvato (sns-management) session ad1516c0, research subagent `agent-a9921a52265df5282.jsonl` (web-fetch of official pages). Final report verbatim.

## Pages fetched

- https://dreamina.capcut.com/ai-video/ai-canvas
- https://dreamina.capcut.com/ai-video/ai-canvas-review
- https://dreamina.capcut.com/ai-video/ai-creative-workspace
- https://dreamina.capcut.com/ai-video/ai-video-agent
- https://dreamina.capcut.com/ai-video/multimodal-ai-workspace
- https://dreamina.capcut.com/ai-video/spaces-ai

## Brief given to the researcher

Read these Dreamina (CapCut) pages in full and report precisely what they say (no guessing, no marketing fluff; say 'not stated' when the page doesn't say):
1. https://dreamina.capcut.com/ai-video/ai-canvas-review
2. https://dreamina.capcut.com/ai-video/multimodal-ai-workspace
3. https://dreamina.capcut.com/ai-video/spaces-ai
4. https://dreamina.capcut.com/ai-video/ai-creative-workspace (english version if available)
Also follow links to any Dreamina help/docs/tutorial pages about the Agent mode / Octo / Canvas / Spaces / Projects / Assets and read them (up to 6 extra pages).
Report, with page URL per fact: (a) every UI surface and node type (names, what each does), (b) how the agent (Octo / Agent mode) plans and acts: tools, whether it edits an existing canvas, how a user steers it, (c) what persists (prompts, references, generations, projects, assets, subject nodes, chat/session history, memory) and the scope/limits, (d) import/export, (e) credits/billing, (f) limitations. Quote short key phrases (under 15 words each) where exact wording matters.

## Report

## Dreamina (CapCut) canvas, agent, and pricing: report

Dreamina's own pages describe a browser-based node canvas ("AI Canvas") with an AI agent ("Octo" on the video-agent page) and a built-in timeline. Most of the claims are marketing copy. The only limits stated are the cons list on CR and a few FAQ and footnote lines. Nothing I read documents a Projects object, chat-history retention, memory, or a help center.

**Pages read (keys used below)**
- CR = https://dreamina.capcut.com/ai-video/ai-canvas-review (read in full; dated Oct 13, 2026)
- MW = https://dreamina.capcut.com/ai-video/multimodal-ai-workspace (verbatim to about 79k of 118k chars; the rest is pricing tables, read via summary)
- SP = https://dreamina.capcut.com/ai-video/spaces-ai (verbatim to about 79k of 115k; rest is pricing, via summary)
- CW = https://dreamina.capcut.com/ai-video/ai-creative-workspace (verbatim to about 79k of 116k; rest is pricing, via summary; the page is already "en" and I found no separate English URL)
- AC = https://dreamina.capcut.com/ai-video/ai-canvas (verbatim to about 79k of 102k; rest is pricing, testimonials and tools list, via summary)
- VA = https://dreamina.capcut.com/ai-video/ai-video-agent (read in full)

Facts marked "(summary)" come from a model-generated summary of an unread tail, not verbatim text. I followed only two extra same-site links, AC and VA, both linked from the first pages. I did not fetch the competitor review /ai-video/higgsfield-canvas or /ai-video/ai-short-film-generator.

### (a) UI surfaces and node types

- **Canvas:** "browser-based infinite board" (CR). Pages call it AI Canvas, and SP calls the same product "AI Spaces" (SP).
- **Creation menu:** double-click the canvas to open it (MW Step 1, CW Step 1, AC Step 1, SP). Options named in MW: "Text, Image, Video, Audio, Timeline, or Element."
- **Node types:** CR lists "text, images, video, audio, subjects, timelines, groups, and files." VA lists reference nodes as "Character, Object, Environment, or Style." SP lists "character, object, environment, style, and Custom nodes." AC and CW also name "principal nodes" (CW Benefits). Naming is inconsistent: "Subject" (CR/AC), "Element" (MW), "principal" (AC/CW).
- **Note node:** AC Step 1 says to pick "Node," then use the note to write the idea.
- **Toolbar and actions:** "Use Import Asset to add existing files" (CR Step 1). AC lists group, rearrange, rename, and connect nodes. CR Step 2: "Select individual clips to refine" with sound, frame, or upscaling tools. MW lists: "expand and crop images, modify text, fuse visuals, create multi-angle variations, trim videos, interpolate frames, adjust first and last frames, edit audio."
- **Timeline:** "Add to timeline" action. Reorder shots, adjust placement, organize audio, preview (CR Step 3). MW: "Built-in timeline" is a feature. CR cons: "One timeline at a time."
- **Groups/labels:** auto-grouping (CR); "groups, labels, and visual previews" (MW); drag a selection box to group (VA).
- **Octo (video agent):** chat opened by pressing the "/" key on the canvas (VA Step 1). Adds references via the left toolbar or right-click (VA Step 2). "Generate Video" button under a scene block in the story outline (VA Step 3).
- **Agent chat:** "Chat with AI Agent in Dreamina to brainstorm ideas" (CW). CR Step 1 says start "through Agent chat or the toolbar."

### (b) Agent planning and acting

- **Scope of the agent:** "Its AI Agent can build from plain-language instructions" (CR). It "understands your project context and the objects that surround it" (SP). Octo "reads your entire canvas layout" (VA).
- **Editing an existing canvas:** yes, per CR FAQ: "describe the change you want and let the Agent handle the edit." VA says it generates new scenes that match existing canvas characters and backgrounds.
- **Planning:** VA Step 1: Octo "deconstructs your idea into structural scripts, scene breakdowns, and shot lists." VA says the script-to-video agent breaks scripts into "scene breakdowns, clips, or storyboard frames" on the canvas. Octo "doesn't wait to be asked" and "actively uses multi-image references" (VA). These are marketing claims.
- **Tools/models the agent uses:** VA names Seedream 5.0 Lite, GPT Image 2 (images) and Seedance 2.0 (video). CR and MW name Seedream 5.0 Pro (image), Seedance 2.5 (video), Seedaudio 2.0 (audio). No list of agent functions or APIs is given.
- **Node-level control by the agent:** AC (Key features): "The AI Agent and CLI support will also let users create and manage canvas nodes." It also says tools "like Codex" can operate the canvas through the CLI. The wording is future tense, and AC's summary calls these planned.
- **Steering:** prompts in the chat panel or a node (VA prompts section); selecting clips; starring or bookmarking references (VA Step 2; SP "Star important references"); "/" command.
- **Not stated:** whether the agent asks for confirmation before acting, undo behavior, or how Octo relates to the "AI Agent" name (VA and CW say "Octo's AI Agent"; CR, SP, AC say only "AI Agent").

### (c) What persists

- **Prompts, settings, and generations:** the canvas keeps "prompts, settings, and intermediate results attached to your workflow" (MW). AC: edits preserve "prompts, references, settings, and generation history." CR: "Intermediate results remain editable and reusable."
- **Edits:** CR: the canvas keeps "every iteration accessible in one place." AC: edits create "new versions" of assets, while the originals stay on the canvas.
- **Asset library:** you can "import previous generations and subjects from the asset library" (CR). The library's scope and retention are not stated.
- **Subject nodes:** "limited to the canvas where they were created and cannot be carried into another canvas" (CR cons).
- **Search:** "Search covers the current canvas only" (CR cons).
- **Projects:** no separate Projects object is described. The canvas serves as the project.
- **Chat/session history and memory:** not stated.
- **Storage duration and cloud:** not stated. AC's summary says it "runs in the cloud" (summary).

### (d) Import and export

- **Import:** "Import Asset" (CR Step 1). Drag and drop files onto the canvas (VA Step 2). MW: "Bring any file in without converting."
- **Export:** CR Step 3: "save the project as an MP4, XML, or Jianying draft." The Jianying draft is "for use in Premiere Pro, Final Cut, or CapCut." Single assets: "Download" (MW Step 3, CW Step 3).
- **Watermark:** "Remove the Dreamina watermark in downloads" is a paid-plan benefit (MW pricing, CW pricing).
- **Not stated:** whole-canvas export or re-import as a project file, and any export format beyond the three above.

### (e) Credits and billing

- **Free tier:** "Dreamina offers free daily credits for creators" (VA FAQ). AC's summary says a subscription is needed after those run out.
- **Credit pool:** "one credit pool and a built-in timeline" (CR).
- **Plan price, credits per month, CAD (as displayed on MW, AC, SP, CW; auto-renew, "Cancel anytime"):**

| Plan | Credits/mo | Monthly | 1-month | Quarterly | Yearly |
|---|---|---|---|---|---|
| Basic | 2,182 | 20.49 (first month 0.39) | 24.49 | 63 | 140.99 first year, then 234.99 |
| Standard | 5,349 | 50 (first month 30) | 56.90 | 146 | 341.99 first year, then 569.99 |
| Advanced 12K | 11,997 | 109.99 (first month 54.99) | 112.99 | 314 | 649.99 first year, then 1,299.99 |
| Advanced 24.4K | 24,425 | 222 (first month 111) | 268 | 380 first quarter, then 634 | 1,272 first year, then 2,544 |
| Advanced 32.6K | 32,612 | 296 (first month 148) | 355 | 506 first quarter, then 843 | 1,690 first year, then 3,380 |
| Advanced 49.3K | 49,265 | 446 (first month 223) | 537 | 765 first quarter, then 1,275 | 2,551 first year, then 5,102 |
| Ultra | 81,878 | 725 (first month 362.50) | 892 | 1,255 first quarter, then 2,091 | 4,181 first year, then 8,362 |

- **Promotions:** "Early Black Friday deals" run "Oct 27 to Nov 6" (year not shown). Several free-model offers require subscribing by "Dec 15, 2025" or "Feb 28, 2026." Both dates are already past as of today (2026-10-30), but the pages still show them. Their keep-active end dates are Dec 15, 2026 and Feb 28, 2027.
- **Non-refundable:** "Orders that include added free benefits are non-refundable" (MW, SP, CW pricing footnote).
- **Per-second video prices:** Seedance 2.5 is shown as "from C$0.13/sec" (Advanced) and "from C$0.11/sec" (Ultra), and as low as "from C$0.01/sec" on a Basic promo card. Per-action credit costs for other nodes are not stated.

### (f) Limitations

- **Collaboration:** "Dreamina AI Canvas does not support real-time team editing yet" (CR FAQ).
- **Scope:** subject nodes stay in one canvas; search covers the current canvas only; one timeline at a time, and timelines "cannot currently be merged or linked together" (CR cons).
- **Learning curve:** CR: node workflows "require more time to understand than a simple prompt box."
- **Free-tier output:** watermarked downloads; free Seedance 2.5 videos "only at 720p"; free GPT Image 2.5 images "only at 1K Medium" (MW, SP, CW pricing).
- **Priority:** "Fast queue (highest priority)" is listed for Advanced and Ultra. Basic and Standard get "Fast queue" without the priority label.
- **Not stated:** canvas size or node limits, free-tier video length, retention periods, and whether the agent can undo its own changes.
