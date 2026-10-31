# Read Higgsfield official docs

Extracted 2026-10-30 from the Pikvato (sns-management) session ad1516c0, research subagent `agent-a3349c0bc9ee47af9.jsonl` (web-fetch of official pages). Final report verbatim.

## Pages fetched

- https://higgsfield.ai/blog/how-we-built-supercomputer
- https://higgsfield.ai/creator-hub/help-center/credits/how-credits-work
- https://higgsfield.ai/creator-hub/help-center/credits/what-are-unlimited-models-and-which-plans-include-them
- https://higgsfield.ai/creator-hub/help-center/getting-started/what-is-higgsfield
- https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-access-higgsfield-via-cli
- https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent
- https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp
- https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas
- https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-supercomputer
- https://higgsfield.ai/creator-hub/help-center/tools/which-higgsfield-tool-should-i-use

## Brief given to the researcher

Read these Higgsfield pages in full and report precisely what they say (no guessing, no marketing fluff; say 'not stated' when the page doesn't say):
1. https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas
2. https://higgsfield.ai/blog/how-we-built-supercomputer
3. https://higgsfield.ai/creator-hub/help-center/getting-started/what-is-higgsfield
4. https://higgsfield.ai/creator-hub/help-center/tools/which-higgsfield-tool-should-i-use
Also follow links from these pages to any help-center articles about Supercomputer / agent / Projects / Assets / MCP and read them (up to 6 extra pages).
Report, with page URL per fact: (a) every UI surface and node type (names, what each does), (b) how the agent plans and acts: tools it calls, whether it edits an existing canvas, how a user steers/approves, (c) what persists (prompts, references, generations, projects, assets, templates, chat history, memory/context) and for how long, (d) skills/harness/architecture claims, (e) billing/credits model, (f) MCP/API surface, (g) limitations. Quote short key phrases (under 15 words each) where exact wording matters.

## Report

# Higgsfield pages: findings

I read the 4 requested pages and 6 linked pages (the limit). Quotes are short and exact. "Not stated" means the page doesn't say.

## (a) UI surfaces and node types

- **Canvas** (tools/how-do-i-use-canvas): "a node-based infinite board for multi-model visual production." Start via higgsfield.ai → Canvas → New canvas. Documented node and UI elements:
  - **Text Prompt node**: "Add a Text Prompt node."
  - **Generation node**: connect a prompt node to it and select a model.
  - **Reference nodes**: "Upload reference images or audio files, or pull in an existing generation from your Assets."
  - **Audio nodes**: attach to video generation nodes for voice references, voiceover, or audio sync.
  - **Generate** button on each node: nodes "can be run individually or triggered in sequence."
  - **Save as a template**, and **Share** in canvas settings.
  - Canvas also appears as an option in the Figma/FigJam plugin ("Canvas Nodes in FigJam").
  - Full node-type list: not stated.
- **Supercomputer sidebar** (tools/how-do-i-use-supercomputer): New chat and Search; Apps; Games; Skills (catalog with "Skills by Higgsfield," "Made by community," "My skills"); Connectors (e.g., Telegram, Slack, TikTok, Gmail, Google Drive, Notion); Memory ("Context the agent keeps between chats"); Faceless channel (YouTube videos up to 15 minutes, 12 visual styles).
- **Cinema Studio, Marketing Studio, AI Influencer** (getting-started/what-is-higgsfield, tools/which-higgsfield-tool-should-i-use): described only at a summary level. Cinema Studio: "camera and lighting control, multi-shot scenes." Marketing Studio: "a product URL or image becomes a finished video ad." AI Influencer: "a game-style builder."

## (b) How the agent plans and acts

- **Supercomputer** (tools/how-do-i-use-supercomputer): "The agent proposes a plan, runs the generation steps, and returns the results in the same chat." It "breaks a request into steps, picks the right model for each one."
- **Steering**: "You can refine by replying: adjust a step, change a model, or ask for variations, and the agent re-runs only what changed."
- **Approval gate**: not stated in the Supercomputer article. The MCP article says a user can instruct the agent to approve before spending, but calls this "a prompt-level instruction, not a hard limit" (integrations/how-do-i-connect-higgsfield-to-ai-agent).
- **Model routing**: generation models "run automatically: the agent routes each sub-task." The chat LLM can be auto-routed or chosen from "Anthropic, OpenAI, Google, xAI, DeepSeek, and others."
- **Tools called**: the tool names are not stated in any page. Connectors reach "messaging, social publishing, email and calendar, and documents."
- **Canvas agent**: the Canvas help article doesn't mention an agent. The blog (blog/how-we-built-supercomputer) says "Canvas followed soon after... an agent made sense there too," and that Supercomputer "runs inside Cinema Studio and in Canvas." Whether the Canvas agent edits an existing canvas: not stated.
- **Intra-Canvas steering**: not stated.
- **Agent via MCP/CLI**: "The agent selects a model automatically if you don't name one." The agent "can't read images attached to the chat itself" and opens an upload window instead (integrations/how-do-i-connect-higgsfield-to-ai-agent).

## (c) What persists, and for how long

- **Generations**: land in Assets, including MCP, CLI, and Supercomputer output (integrations/what-is-higgsfield-mcp, integrations/how-do-i-access-higgsfield-via-cli). "Results typically appear within 60 seconds of the job completing." Retention period: not stated.
- **Canvas**: "Canvas autosaves periodically: a hard refresh restores the most recent autosave." Retention period: not stated.
- **Canvas templates**: "Save the workflow for future projects." Persistence period: not stated.
- **Projects**: the blog says "Projects was added so work inside Supercomputer can keep shared context." No help article found.
- **Memory**: "Context the agent keeps between chats" (tools/how-do-i-use-supercomputer). Duration and scope: not stated.
- **Chat history**: not stated.
- **Visual context**: the blog says the system connects names to assets "without repeatedly loading the entire history of images and video into the LLM." Storage duration: not stated.
- **Workspace storage**: "Storage is measured against your plan's allowance." Extra storage is bought via "Manage Storage" and "The credit cost of additional storage is shown before you confirm."
- **Skills built from chats**: "Supercomputer also builds skills from your chats as you work."

## (d) Skills, harness, and architecture claims (blog/how-we-built-supercomputer, unless noted)

- "Supercomputer is an agentic workspace... Underneath it is a harness built to handle visual context, use different AI models, and apply Skills."
- The harness is described as "the layer that coordinates the models, tools, context, and steps behind the work."
- "The first version took about six weeks to build."
- Earlier "rigid" pipelines: "if a workflow was designed as A, then B, then C, then D, it always ran A, B, C, then D."
- Skills are "know-how — knowledge a human has and an LLM doesn't," per Axultan.
- The team says it "runs evals after major updates."
- Influences: "self-improvement ideas from Hermes and enterprise controls from NVIDIA."
- Reliability: the system should "recover so the user's generations and surrounding work continue."
- Skills catalog (tools/how-do-i-use-supercomputer): official skills include "Product UGC, Higgsfield Faceless Video, Shorts Maker, YouTube Covers, and Personal Clipper."
- Canvas Seedance nodes: "The reference function must be described in the prompt."
- Kling nodes: "treat a directly connected image as a start frame."

## (e) Billing and credits

- **Canvas** (tools/how-do-i-use-canvas): "Building and connecting nodes is free. Credits are deducted only when a node generates content."
- **Canvas and Unlimited**: "all generations in Canvas deduct credits regardless of your plan."
- **Supercomputer**: "Each generation step deducts credits at standard rates, and the running cost is shown as the task proceeds."
- **Supercomputer Free Mode** (blog): "Free Mode text interaction costs zero credits, while image, video, and other generation steps continue to use credits."
- **Supercomputer availability** (tools/which-higgsfield-tool-should-i-use): "Available on paid plans." The Supercomputer article says "Availability and limits depend on your plan."
- **Credit types** (credits/how-credits-work):
  - Subscription credits: "Yes, each billing cycle." Monthly plans reset at each paid renewal; annual plans reset every 30 days. "Yes, unused credits expire at renewal."
  - Credit Pack, Auto-Refill, promo, and Boost credits: each expires "90 days from purchase," except promo credits, which expire on the date shown when issued.
  - Spending order: subscription credits first, then "by expiration date."
- **Refunds**: "Usually yes: the refund is automatic and lands within a few minutes."
- **Usage log**: Manage Account → Usage.
- **Unlimited** (credits/what-are-unlimited-models-and-which-plans-include-them): mid and top plans include Unlimited models. "Most included models come with 365-day Unlimited access." It applies "only on higgsfield.ai." "Unlimited runs in the standard queue"; credit generations run in the priority queue.
- **Free generations**: "a one-time pool granted when you purchase the plan." They do not renew and apply only on higgsfield.ai.
- **Fair use**: "Automation tools, scripting, credential sharing, and reselling access are strictly prohibited."

## (f) MCP, CLI, and API surface

- **MCP connector URL**: `https://mcp.higgsfield.ai/mcp`. Auth is OAuth: "no API key is needed." API keys belong to "the Higgsfield API, a separate developer product."
- **Setup per agent** (integrations/how-do-i-connect-higgsfield-to-ai-agent):
  - Claude: Settings → Connectors → Add custom connector.
  - ChatGPT: official Higgsfield Plugin. Audio and Website Building are not available there.
  - Cursor: marketplace.
  - Claude Code, OpenClaw, and Hermes: the agent installs the CLI via `npm i -g @higgsfield/cli`, then `higgsfield auth login`, then `npx skills add higgsfield-ai/skills`.
- **MCP operations**: image and video generation; upscaling; background removal; expand image and video; Kling 3.0 Motion Control; Soul and Elements; audio (voiceover, voice cloning, voice change, dubbing); Personal Clipper; credit balance and listing generations/uploads.
- **MCP capabilities** (integrations/what-is-higgsfield-mcp): Marketing Studio, Ad Multiplier, and Genjutsu (Motion Transfer, Object Swap, Restyle).
- **MCP reference uploads**: the agent "opens the Higgsfield upload window"; URL import is also supported.
- **CLI + Skills** (integrations/how-do-i-access-higgsfield-via-cli): three skills, "generate, soul, and product-photoshoot." Invoked as `/higgsfield:generate`. The page describes image presets (e.g., product_shot, hero_banner) and video presets (e.g., UGC, Tutorial, Unboxing).
- **Two different "skills"**: CLI Skills and Supercomputer Skills are "Two separate systems with the same name... They are not interchangeable."
- **Tool-level API schemas or endpoint names**: not stated.

## (g) Limitations

- Unlimited and free generations do not work in Canvas, Supercomputer, MCP, CLI, or other automated tools (credits/how-credits-work, integrations/what-is-higgsfield-mcp).
- "There's no native credit cap" for agents (integrations/how-do-i-connect-higgsfield-to-ai-agent).
- "Website Building skill isn't available in ChatGPT." Audio is also unavailable there.
- Supercomputer Unlimited access is "Web only."
- Canvas: "Canvas froze and I lost my work" is covered only by autosave, with contact-support guidance for missing projects.
- Canvas Seedance and Kling reference behavior requires specific prompt phrasing or element creation first (see (b)).
- Supercomputer: "a complex Supercomputer task uses more credits than a single generation."
- Blog's claim about evaluation and cinematographer feedback is qualitative; no metrics are given.
- Model list: "Seedance, Kling, Veo, Sora 2, Nano Banana" (getting-started/what-is-higgsfield).

## Pages read

1. https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas (dateModified 2026-09-01)
2. https://higgsfield.ai/blog/how-we-built-supercomputer (datePublished 2026-09-16)
3. https://higgsfield.ai/creator-hub/help-center/getting-started/what-is-higgsfield (dateModified 2026-09-14)
4. https://higgsfield.ai/creator-hub/help-center/tools/which-higgsfield-tool-should-i-use (dateModified 2026-09-01)
5. https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-supercomputer (dateModified 2026-10-26)
6. https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp (dateModified 2026-10-24)
7. https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent (dateModified 2026-09-24)
8. https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-access-higgsfield-via-cli (dateModified 2026-09-24)
9. https://higgsfield.ai/creator-hub/help-center/credits/what-are-unlimited-models-and-which-plans-include-them (dateModified 2026-08-28)
10. https://higgsfield.ai/creator-hub/help-center/credits/how-credits-work (dateModified 2026-09-22)

Linked but not fetched: the Higgsfield API article, "What are Higgsfield Apps," "How do I use Cinema Studio," "How do Higgsfield plans work," "What are Exclusive Offers," the external integrations article, and the changelog.
