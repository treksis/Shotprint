import type { MediaAsset } from "@sns/core/schemas";
import { ITEM_SIZE, type StepKey, type StudioItem } from "./types.ts";

export const RUN_STEPS: Array<{ key: StepKey; credits?: number }> = [
  { key: "reading" },
  { key: "prompt" },
  { key: "generate", credits: 4 },
  { key: "caption" },
  { key: "post" },
];

export const STEP_DELAY_MS = 900;

let counter = 0;
export const newItemId = (): string => `item_${Date.now().toString(36)}${counter++}`;

/** Right edge of everything on the canvas, so new items land beside the old ones. */
export function nextColumnX(items: StudioItem[]): number {
  if (items.length === 0) return 40;
  return Math.max(...items.map((item) => item.x + ITEM_SIZE[item.kind].w)) + 90;
}

/**
 * Mock of one agent turn: a prompt note, an image and a post draft, wired together.
 * Images are existing library files standing in for a generation.
 */
export function mockRunItems(
  prompt: string,
  existing: StudioItem[],
  pool: MediaAsset[],
  caption: string,
): StudioItem[] {
  const x = nextColumnX(existing);
  const note: StudioItem = { id: newItemId(), kind: "note", x, y: 40, text: prompt, inputs: [] };
  const pick = pool.length > 0 ? pool[existing.length % pool.length] : undefined;
  const image: StudioItem = {
    id: newItemId(),
    kind: "image",
    x: x + ITEM_SIZE.note.w + 90,
    y: 0,
    asset: pick,
    inputs: [note.id],
  };
  const post: StudioItem = {
    id: newItemId(),
    kind: "post",
    x: image.x + ITEM_SIZE.image.w + 90,
    y: 20,
    text: caption,
    asset: pick,
    inputs: [image.id],
  };
  return [note, image, post];
}

export function edgesOf(
  items: StudioItem[],
): Array<{ id: string; from: StudioItem; to: StudioItem }> {
  const byId = new Map(items.map((item) => [item.id, item]));
  return items.flatMap((to) =>
    to.inputs.flatMap((fromId) => {
      const from = byId.get(fromId);
      return from ? [{ id: `${fromId}-${to.id}`, from, to }] : [];
    }),
  );
}

export function edgePath(from: StudioItem, to: StudioItem): string {
  const a = { x: from.x + ITEM_SIZE[from.kind].w, y: from.y + ITEM_SIZE[from.kind].h / 2 };
  const b = { x: to.x, y: to.y + ITEM_SIZE[to.kind].h / 2 };
  const bend = Math.max(40, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`;
}
