import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { app } from './index';
import { memoryStore, setStudioStore } from './studio/store';
import { setAssetBackend } from './assets';
import { setStudioSandbox } from './studio/sandbox';
import { dockerSandbox } from './sandbox/runtime';
import type { StudioProject } from '../shared/studio';

// Load .env and .dev.vars into process.env for local development
for (const fileName of ['.env', '.dev.vars']) {
  try {
    const filePath = path.resolve(process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const rawKey = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[rawKey]) {
            process.env[rawKey] = val;
          }
          const upperKey = rawKey.toUpperCase();
          if (!process.env[upperKey]) {
            process.env[upperKey] = val;
          }
        }
      }
    }
  } catch {
    // Ignore env file load error
  }
}

// Studio projects persist to .data/studio-projects.json in node dev (D1 in Cloudflare).
const dataFile = path.resolve(process.cwd(), '.data/studio-projects.json');
let saved: StudioProject[] = [];
try {
  saved = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
} catch {
  saved = [];
}
setStudioStore(
  memoryStore(saved, (all) => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(all));
  })
);

// Each project runs Muse Code in its own Docker container (Cloudflare Sandbox when deployed).
setStudioSandbox(dockerSandbox);
// Locally anyone may pick Muse Wonder; deployed, it needs the judge passcode.
process.env.STUDIO_OPEN ??= '1';

// Uploaded and generated files survive dev-server restarts in .data/assets (R2 in Cloudflare).
const assetDir = path.resolve(process.cwd(), '.data/assets');
setAssetBackend({
  async get(key) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(assetDir, `${key}.json`), 'utf-8'));
      const buf = fs.readFileSync(path.join(assetDir, key));
      return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), ...meta };
    } catch {
      return null;
    }
  },
  async put(key, asset) {
    fs.mkdirSync(assetDir, { recursive: true });
    fs.writeFileSync(path.join(assetDir, key), Buffer.from(asset.buffer));
    fs.writeFileSync(path.join(assetDir, `${key}.json`), JSON.stringify({ contentType: asset.contentType, fileName: asset.fileName }));
  },
});

const port = Number(process.env.PORT || 8788);

console.log(`MuseClone Hono Worker API listening on http://localhost:${port}`);

serve({
  fetch: (req) => app.fetch(req, process.env as any),
  port,
});
