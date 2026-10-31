import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { app } from './index';

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

const port = Number(process.env.PORT || 8788);

console.log(`MuseClone Hono Worker API listening on http://localhost:${port}`);

serve({
  fetch: (req) => app.fetch(req, process.env as any),
  port,
});
