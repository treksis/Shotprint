import type { MediaAsset } from "@sns/core/schemas";

export type ItemKind = "note" | "image" | "post";

export interface StudioItem {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  text?: string;
  /** Library file the item points at. Studio never stores files itself. */
  asset?: MediaAsset;
  /** Object URL of a file dropped from the desktop (mock only, not uploaded). */
  localUrl?: string;
  /** Ids of the items this one was made from, drawn as lines. */
  inputs: string[];
}

export type StepKey = "reading" | "prompt" | "generate" | "caption" | "post";

export interface AgentStep {
  key: StepKey;
  status: "running" | "done" | "stopped";
  credits?: number;
  /** Items on the canvas when the step ran. */
  count?: number;
}

export type StudioMessage =
  | { id: string; role: "user"; text: string; attachments: string[] }
  | {
      id: string;
      role: "agent";
      steps: AgentStep[];
      state: "running" | "done" | "stopped";
      /** Items the run created, shown as chips. */
      created: string[];
    };

export const ITEM_SIZE: Record<ItemKind, { w: number; h: number }> = {
  note: { w: 240, h: 132 },
  image: { w: 220, h: 244 },
  post: { w: 280, h: 236 },
};

export const ASSET_DRAG_TYPE = "application/x-pikvato-asset";
