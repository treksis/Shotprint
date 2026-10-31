#!/usr/bin/env node
// Runs inside a project's sandbox. Keeps one `muse serve` (MSP over stdio) alive for the project, so a
// turn keeps running when the Studio server restarts or the browser disconnects.
//
//   node relay.mjs serve <events.jsonl> -- muse serve ...   start the host process (detached)
//   node relay.mjs connect                                   pipe this process's stdio to it (one client)
//
// Requests from the client are forwarded with relay-scoped ids and their responses routed back. Every
// notification is appended to <events.jsonl> as {"seq","t","method","params"}: the Studio server tails
// that file, so the transcript survives restarts and a finished session replays exactly as it ran.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

const SOCK = "/tmp/studio-msp.sock";
const [mode, ...rest] = process.argv.slice(2);

if (mode === "connect") {
  const s = net.connect(SOCK);
  s.on("error", (e) => { process.stderr.write(`relay: ${e.message}\n`); process.exit(1); });
  process.stdin.pipe(s);
  s.pipe(process.stdout);
  s.on("close", () => process.exit(0));
} else if (mode === "serve") {
  const log = rest[0];
  const cmd = rest.slice(rest.indexOf("--") + 1);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  let seq = 0;
  try { seq = fs.readFileSync(log, "utf8").split("\n").filter(Boolean).length; } catch {}
  const out = fs.openSync(log, "a");

  const child = spawn(cmd[0], cmd.slice(1), { stdio: ["pipe", "pipe", "inherit"] });
  child.on("exit", (code) => { fs.rmSync(SOCK, { force: true }); process.exit(code ?? 1); });

  let nextId = 1;
  const routes = new Map(); // relay id -> { conn, id }
  let initResult = null;
  const pendingInit = [];
  let initSent = false;
  let initializedSent = false;
  let client = null;

  const send = (conn, msg) => { try { conn?.write(JSON.stringify(msg) + "\n"); } catch {} };

  lines(child.stdout, (line) => {
    let m;
    try { m = JSON.parse(line); } catch { return; }
    if (m.id !== undefined && (m.result !== undefined || m.error !== undefined)) {
      const r = routes.get(m.id);
      routes.delete(m.id);
      if (r === "init") {
        initResult = m;
        for (const p of pendingInit.splice(0)) send(p.conn, { ...m, id: p.id });
      } else if (r) send(r.conn, { ...m, id: r.id });
    } else if (m.method && m.id === undefined) {
      fs.writeSync(out, JSON.stringify({ seq: ++seq, t: Date.now(), method: m.method, params: m.params }) + "\n");
    } else if (m.method && m.id !== undefined) {
      // A server-to-client request (none are expected with prompts disabled): refuse it.
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "not supported by Studio" } }) + "\n");
    }
  });

  fs.rmSync(SOCK, { force: true });
  net.createServer((conn) => {
    if (client) client.destroy();
    client = conn;
    lines(conn, (line) => {
      let m;
      try { m = JSON.parse(line); } catch { return; }
      if (m.method === "initialize") {
        // The host process is initialized once; later clients get the cached answer.
        if (initResult) return send(conn, { ...initResult, id: m.id });
        pendingInit.push({ conn, id: m.id });
        if (initSent) return;
        initSent = true;
        const rid = nextId++;
        routes.set(rid, "init");
        return child.stdin.write(JSON.stringify({ ...m, id: rid }) + "\n");
      }
      if (m.method === "initialized") {
        if (initializedSent) return;
        initializedSent = true;
        return child.stdin.write(line + "\n");
      }
      if (m.id === undefined) return child.stdin.write(line + "\n");
      const rid = nextId++;
      routes.set(rid, { conn, id: m.id });
      child.stdin.write(JSON.stringify({ ...m, id: rid }) + "\n");
    });
    conn.on("error", () => {});
    conn.on("close", () => { if (client === conn) client = null; });
  }).listen(SOCK);
} else {
  process.stderr.write("usage: relay.mjs serve <events.jsonl> -- <cmd...> | relay.mjs connect\n");
  process.exit(2);
}

function lines(stream, fn) {
  let buf = "";
  stream.setEncoding("utf8");
  stream.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.trim()) fn(line);
    }
  });
}
