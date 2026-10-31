# Read Cloudflare Sandbox and Agents docs

Extracted 2026-10-30 from the Pikvato (sns-management) session ad1516c0, research subagent `agent-ab4efc821fae34ad3.jsonl` (web-fetch of official pages). Final report verbatim.

## Pages fetched

- https://developers.cloudflare.com/agents/agent-class/internals/
- https://developers.cloudflare.com/agents/runtime/capabilities/sessions/
- https://developers.cloudflare.com/agents/runtime/capabilities/state/
- https://developers.cloudflare.com/containers/platform/limits/
- https://developers.cloudflare.com/sandbox/
- https://developers.cloudflare.com/sandbox/concepts/lifetime/
- https://developers.cloudflare.com/sandbox/files/
- https://developers.cloudflare.com/sandbox/sdk/concepts/containers/
- https://developers.cloudflare.com/sandbox/sdk/concepts/sandboxes/
- https://developers.cloudflare.com/sandbox/sdk/concepts/security/
- https://developers.cloudflare.com/sandbox/sdk/configuration/dockerfile/
- https://developers.cloudflare.com/sandbox/sdk/get-started/

## Brief given to the researcher

Read these Cloudflare docs pages and report precisely what they say (no guessing; say 'not stated' otherwise), with the URL per fact:
1. https://developers.cloudflare.com/sandbox/sdk/get-started/
2. https://developers.cloudflare.com/sandbox/sdk/concepts/containers/
3. https://developers.cloudflare.com/sandbox/sdk/concepts/security/
4. https://developers.cloudflare.com/agents/runtime/capabilities/sessions/
5. https://developers.cloudflare.com/agents/runtime/capabilities/state/
6. https://developers.cloudflare.com/agents/agent-class/internals/
Also read any linked pages on Sandbox limits/pricing, persistence (does the filesystem survive sleep? backups/snapshots? mounting R2 buckets?), lifecycle (sleep/idle timeout, cold start time), and installed tooling (ffmpeg? image libs?), up to 6 extra pages.
Report: (a) what a sandbox is (VM-level or container, isolation boundary), how a Worker creates/addresses one (API names), exec/file APIs, preview URLs/ports, (b) persistence and lifecycle: sleep timeout, state after sleep, R2 mount or backup options, (c) limits, instance types, pricing model and beta/GA status, (d) Agents SDK: Agent class = Durable Object, state sync to clients over WebSockets (useAgent), Sessions (durable chat history tree, compaction, search), scheduling, tool-calling and human-approval support, (e) which pieces need a paid plan or are beta, (f) a minimal code example of each (short, verbatim API names only).

## Report

## Scope note

The six pages you listed, and most of the linked ones, document **Sandbox SDK 0.x**. Cloudflare's current overview [OV] and its 1.0 pages [LT], [FI] describe a different API. Where they differ, I report both and label them. The 0.x pages say "For new applications, refer to" the 1.0 docs. The 1.0 pages use "stop" where the 0.x pages use "sleep." No page I read uses the word "sleep" for 1.0.

**URL key** (each fact is tagged with its source):
- [GS] https://developers.cloudflare.com/sandbox/sdk/get-started/ (0.x)
- [CR] https://developers.cloudflare.com/sandbox/sdk/concepts/containers/ (0.x)
- [SEC0] https://developers.cloudflare.com/sandbox/sdk/concepts/security/ (0.x)
- [LC0] https://developers.cloudflare.com/sandbox/sdk/concepts/sandboxes/ (0.x lifecycle)
- [DF0] https://developers.cloudflare.com/sandbox/sdk/configuration/dockerfile/ (0.x)
- [OV] https://developers.cloudflare.com/sandbox/ (1.0 overview)
- [LT] https://developers.cloudflare.com/sandbox/concepts/lifetime/ (1.0)
- [FI] https://developers.cloudflare.com/sandbox/files/ (1.0)
- [LIM] https://developers.cloudflare.com/containers/platform/limits/
- [SES] https://developers.cloudflare.com/agents/runtime/capabilities/sessions/
- [ST] https://developers.cloudflare.com/agents/runtime/capabilities/state/
- [INT] https://developers.cloudflare.com/agents/agent-class/internals/

## (a) What a sandbox is, and how a Worker uses one

**Isolation boundary.** The docs say the same thing in different words:
- [OV]: "Each instance is a microVM with its own kernel and network, so no other workload shares it." Also: "The code cannot directly read the memory or data of your application."
- [LT]: an instance is "a Linux virtual machine that runs your image."
- [SEC0] (0.x): "Each sandbox runs in a separate VM."
- [CR] (0.x) says instead: "Each sandbox runs in an isolated Linux container." This conflicts with [SEC0] and I could not resolve it from the pages.
- [OV]: "HTTP from the Internet reaches the instance only through your Worker."

**Object model.** A sandbox is a Durable Object that starts and stops a container. [LT] says: "A Linux sandbox is a Durable Object that starts and stops a container." The Durable Object keeps storage, and the instance keeps processes and disk.

**Creation and addressing, 0.x** [GS]:
- `getSandbox(env.Sandbox, "my-sandbox")` is "Gets or creates a sandbox instance by ID." Use a stable ID to reconnect.
- The Worker binding is `Sandbox`. The `wrangler.jsonc` `containers` entry sets `class_name: "Sandbox"`, `instance_type: "lite"`, and `max_instances: 1`.

**Creation and addressing, 1.0** [OV], [LT]:
- The Durable Object is reached by name, and `this.ctx.container.start()` starts the instance.
- `container.start({ image, entrypoint, enableInternet })` and `container.exec([...])` appear in [OV]. The page does not show how `container` is obtained.
- [OV] also lists a separate product, Dynamic Workers (`env.LOADER.load(...)`), for running untrusted JavaScript, Python or WebAssembly without a Linux instance.

**Exec and file APIs.**
- 0.x [GS], [CR], [SEC0], [LC0]: `exec()` (waits and returns stdout, stderr, exitCode, success), `startProcess()` (background), `writeFile()`, `readFile()`, `deleteFile()`, `listFiles()`, `destroy()`, `setKeepAlive()`.
- 1.0 [OV], [FI]: `container.exec(["uname", "-a"])` returns a process, and `process.output()` returns its output. The `Files` class from `@cloudflare/sandbox` "moves files between your Worker and a running sandbox." Its method names are not shown on the pages I read.

**Preview URLs and ports.**
- 0.x [CR]: `await sandbox.exposePort(8000, { hostname })` gives `exposed.url`. Preview URLs "include randomly generated tokens" [SEC0]. `unexposePort(8080)` revokes access.
- 0.x quick tunnels [SEC0]: `sandbox.tunnels.get(port)` returns a `*.trycloudflare.com` URL with no separate token. "URLs do not survive a container restart." `sandbox.tunnels.destroy(8080)` revokes.
- 0.x local dev [CR]: "you must add EXPOSE directives to your Dockerfile for each port."
- [SEC0]: "Sandbox IDs provide basic access control but aren't cryptographically secure." Add your own auth.
- 1.0: [OV] links to "Expose services" and "Preview applications" guides, which I did not read. The 1.0 pages I read do not describe port exposure.

## (b) Persistence and lifecycle

**Does the filesystem survive sleep or stop?** No, unless you snapshot it.
- 1.0 [LT]: "An instance runs only until something stops it, and its processes and the files on its disk end with it. The next `start()` creates a new instance."
- 0.x [LC0]: "When the container stops... All files are deleted."
- [FI] (1.0): "Stopping the instance deletes the files on its disk."

**Stop triggers and timeout.**
- 0.x [LC0]: idle after "10 minutes by default, configurable via `sleepAfter`." `keepAlive: true` sends "heartbeat pings every 30 seconds."
- 1.0 [LT]: the instance keeps running for the time set with `setInactivityTimeout()`, "up to 6 hours." Without a timeout, "Cloudflare stops the instance shortly after the Durable Object becomes inactive."
- [LT]: activity means handling a request, running an alarm, streaming a response, or holding a WebSocket accepted with `accept()`. "Code that runs inside the instance does not count as activity."
- [LT]: "The timeout does not survive a restart." The Durable Object must set it again in its constructor.
- [LT]: the main process exiting also stops the instance, and "Cloudflare does not guarantee that an instance runs for a set time."
- [LT]: `destroy()` "stops the instance at once." On a timeout, processes get `SIGTERM`. "Do not rely on a SIGTERM handler to finish work."
- [LT]: deploys do not stop a running instance.

**Snapshots (1.0, public beta)** [LT], [LIM]:
- `snapshotContainer()` saves the writable root filesystem of a running instance. It does not save separately mounted filesystems, memory, processes, or `/run`.
- Starting from a snapshot creates a new instance with the saved files. The processes do not continue.
- "Cloudflare does not restore a snapshot on its own." Your app stores the snapshot and passes it to the next `start()`.
- Snapshots expire "30 days from creation or the most recent restore." Maximum snapshot size is 20 GB.
- [FI] also lists "Save a sandbox automatically," which uses an alarm in your Durable Object, and "Back up a directory to R2" (DirectoryBackup API), which "saves one directory." The backup and auto-save guides were not read.

**Mounting R2 buckets** [FI], [LT]:
- [FI] lists "Mount an R2 bucket" (S3Mount API) with the trade-off: "Renames, locks, and permissions do not work as they do on a local disk."
- [LT]: "Files in a mounted R2 bucket are objects in that bucket. They remain after every instance stops." A mount ends with its instance, so each new instance mounts the bucket again. Snapshots exclude mounted directories.

**Cold start time:** not stated in any page I read.

## (c) Limits, instance types, pricing, and status

**Instance types** [LIM]:

| Type | vCPU | Memory | Disk |
|---|---|---|---|
| lite | 1/16 | 256 MiB | 2 GB |
| basic | 1/4 | 1 GiB | 4 GB |
| standard-1 | 1/2 | 4 GiB | 8 GB |
| standard-2 | 1 | 6 GiB | 12 GB |
| standard-3 | 2 | 8 GiB | 16 GB |
| standard-4 | 4 | 12 GiB | 20 GB |

- Custom types [LIM]: 1 to 4 vCPU, up to 12 GiB memory, up to 20 GB disk, at least 3 GiB per vCPU.
- `dev` and `standard` are aliases for `lite` and `standard-1`.

**Account limits** [LIM]: concurrent memory 6 TiB, concurrent vCPU 1,500, concurrent disk 30 TB, total image storage 50 GB. "All instance size maximums and account limits on this page are defaults and can be increased."

**Other limits:** outbound HTTP request body through an outbound handler is 100 MiB by default [LIM].

**Pricing:** the pricing pages were linked ([OV], [LT]) but I did not read them, so I cannot give rates. [LT] says: "While an instance runs, Containers bill its memory and disk, whether or not anything inside it does work. After the instance stops, it is not billed."

**Status:**
- [OV]: "Available on Workers Paid plan."
- [OV]: "A sandbox container uses the Durable Object scheduling policy, which is in public beta."
- [LT]: snapshots are in "public beta. The API and behavior may change."
- The 0.x pages do not state a beta or GA status.

## (d) Agents SDK

**Agent class is a Durable Object** [INT]: "The `Agent` class is an extension of `DurableObject` — agents *are* Durable Objects." The chain is DurableObject, then `Server` from partyserver, then `Agent`.

**State and sync** [ST], [INT]:
- `State` from `agents/state` stores one JSON value in SQLite, in the `cf_agents_state` table. "Every change rewrites the whole value."
- It "loads the value on first read, caches it in memory, validates every change, and calls you back after each one."
- Pair it with `WebSockets` to sync clients. "On connect, `WebSockets` sends each client its identity frame and then the current value."
- The React client `useAgent` reads `agent.state` and calls `agent.setState(...)`.
- In the `Agent` class, `this.state`, `this.setState()`, and `onStateChanged` are built in. Messages use `type: "cf_agent_state"`.

**Sessions** [SES], marked "Experimental":
- Stores conversation history in the Durable Object's SQLite database. "Messages form a tree, so a conversation can branch."
- Branching: `appendMessage(msg, { parentId })`, `getBranches(id)`, `getHistory({ leafId })`.
- Reads stream: `history()`, `historyBatches()`, `getRecentHistory(maxBytes)`.
- Compaction: "replaces old messages with a summary at read time without deleting them." Set with `createCompactFunction({ summarize, keepRecentTokens })`, `.onCompaction(...)`, and `.compactAfter(80_000)`. `keepRecentTokens` defaults to 20,000.
- Search: `search(query, { limit })`. Full-text, over text parts only. The index builds on first search.
- Storage: tables whose names start with `cf_agents_session_`. Message size is not limited.
- [SES] says `Sessions` "is not a file store." Keep files in R2 and reference them from messages.

**Scheduling** [INT]: `this.schedule(...)` accepts a `Date`, a delay in seconds, or a cron string. Also `getSchedule`, `getSchedules`, `cancelSchedule`. Schedules live in `cf_agents_schedules`. Cron schedules reschedule themselves. One-time schedules are deleted. There is also a task queue, `this.queue`, stored in `cf_agents_queues`.

**Tool calling and human approval** [INT]:
- The base `Agent` class page describes `@callable()` methods that clients call over WebSocket with `{"type": "rpc", ...}`. It does not describe LLM tool calling for the base class.
- For `AIChatAgent` [INT]: it "adds ... tool support (server-side, client-side, and human-in-the-loop)."
- Human-approval support on the base `Agent`: not stated.

**Hibernation and eviction** [INT]: `static options` includes `hibernate: true` by default. Idle eviction is "typically 70–140 seconds with no incoming requests, WebSocket messages, or alarms." `keepAliveWhile()` prevents eviction during long work.

## (e) Paid plan and beta status

- [OV]: Sandboxes are "Available on Workers Paid plan."
- [OV]: the Durable Object scheduling policy for sandbox containers is "in public beta."
- [LT]: snapshots are "Public beta."
- [SES]: Sessions is "Experimental."
- [ST] and [INT] state no plan or beta status.
- 0.x pages [GS] require a Cloudflare account and local Docker for `wrangler deploy`. They do not state a paid-plan requirement.

## (f) Minimal examples (verbatim API names)

**0.x** [GS]:
```ts
import { getSandbox, proxyToSandbox, type Sandbox } from "@cloudflare/sandbox";
const sandbox = getSandbox(env.Sandbox, "my-sandbox");
const result = await sandbox.exec('python3 -c "print(2 + 2)"');
await sandbox.writeFile("/workspace/hello.txt", "Hello, Sandbox!");
const file = await sandbox.readFile("/workspace/hello.txt");
```

**0.x expose** [CR]: `const exposed = await sandbox.exposePort(8000, { hostname });` then `exposed.url`.

**1.0** [OV]:
```ts
container.start({
	image: "cloudflare/debian-trixie",
	entrypoint: ["sleep", "infinity"],
	enableInternet: false,
});
const process = await container.exec(["uname", "-a"]);
const output = await process.output();
```

**1.0 stop/timeout** [LT]: `this.ctx.container.start()` and `setInactivityTimeout()`. The page names these but shows no code for the timeout call.

**Sessions** [SES]:
```js
const sessions = new Sessions();
const session = sessions.session();
await session.appendMessage({ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] });
for await (const message of session.history()) { /* ... */ }
const results = await session.search(query, { limit: 10 });
```

**State** [ST]:
```js
settings = new State({ initialState: { theme: "light", notifications: true } });
this.settings.set(await request.json());
```
React: `useAgent<{ count: number }>({ agent: "CounterAgent", name: "demo" })` and `agent.setState({ count: count + 1 })`.

**Agent** [INT]:
```ts
class MyAgent extends Agent {
	@callable({ description: "Add two numbers" })
	async add(a: number, b: number) { return a + b; }
}
await this.schedule(60, "checkStatus", { check: "health" });
await this.schedule("0 0 * * *", "dailyTask", { type: "cleanup" });
```

## Not read (linked, not fetched)

- Containers pricing (https://developers.cloudflare.com/containers/platform/pricing/), so no rates.
- Sandbox options such as `sleepAfter` (https://developers.cloudflare.com/sandbox/sdk/configuration/sandbox-options/).
- Mount an R2 bucket (https://developers.cloudflare.com/sandbox/files/mount-an-r2-bucket/) and Back up a directory to R2 (https://developers.cloudflare.com/sandbox/files/back-up-a-directory-to-r2/).
- Save and restore a workspace (https://developers.cloudflare.com/sandbox/files/save-and-restore-a-workspace/).
- Expose services (https://developers.cloudflare.com/sandbox/commands/) and preview applications (https://developers.cloudflare.com/sandbox/previews/).
- Sandbox 1.0 reference pages (https://developers.cloudflare.com/sandbox/reference/).

No fetch failed. Every page returned HTTP 200.
