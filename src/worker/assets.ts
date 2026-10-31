import type { WorkerBindings } from './index';

/** Uploaded and generated files. R2 on Cloudflare; node dev swaps in a disk backend (dev-server.ts). */
export interface StoredAsset {
  buffer: ArrayBuffer;
  contentType: string;
  fileName: string;
}

interface AssetBackend {
  get(key: string): Promise<StoredAsset | null>;
  put(key: string, asset: StoredAsset): Promise<void>;
}

const memory = new Map<string, StoredAsset>();
let backend: AssetBackend = {
  async get(key) {
    return memory.get(key) ?? null;
  },
  async put(key, asset) {
    memory.set(key, asset);
  },
};

export function setAssetBackend(b: AssetBackend) {
  backend = b;
}

export const assetUrl = (key: string) => `/api/assets/${encodeURIComponent(key)}`;

export async function putAsset(env: WorkerBindings | undefined, fileName: string, buffer: ArrayBuffer, contentType: string) {
  const safe = (fileName || 'file.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
  await backend.put(key, { buffer, contentType, fileName: safe });
  if (env?.MEDIA_BUCKET) {
    try {
      await env.MEDIA_BUCKET.put(key, buffer, { httpMetadata: { contentType } });
    } catch {
      /* local fallback already holds it */
    }
  }
  return { key, url: assetUrl(key), fileName: safe, contentType, sizeBytes: buffer.byteLength };
}

export async function getAsset(env: WorkerBindings | undefined, key: string): Promise<StoredAsset | null> {
  const local = await backend.get(key);
  if (local) return local;
  if (env?.MEDIA_BUCKET) {
    const obj = await env.MEDIA_BUCKET.get(key);
    if (obj) {
      const buffer = await new Response(obj.body).arrayBuffer();
      return { buffer, contentType: obj.httpMetadata?.contentType || 'application/octet-stream', fileName: key };
    }
  }
  return null;
}
