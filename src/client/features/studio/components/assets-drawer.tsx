import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ITEM_DRAG_TYPE, type StudioItem } from '../types';

export interface AssetsDrawerProps {
  open: boolean;
  assets: StudioItem[];
  onClose: () => void;
  onPick: (asset: StudioItem) => void;
}

/** Files in this project (inputs and uploads) as a drawer over the canvas. Drag one out, or press Enter. */
export function AssetsDrawer({ open, assets, onClose, onPick }: AssetsDrawerProps) {
  return (
    <aside
      aria-hidden={!open}
      inert={!open || undefined}
      className={cn(
        'absolute inset-y-0 left-0 z-20 flex w-[264px] flex-col border-r border-border bg-background transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-[14px] font-medium">Assets</h2>
        <Button variant="ghost" size="icon" aria-label="Close assets" onClick={onClose}>
          <X />
        </Button>
      </div>
      <p className="px-4 pb-3 text-[13px] text-muted-foreground">
        Drag a file onto the canvas or the chat. Drop files from your desktop anywhere.
      </p>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-3 pb-4">
        {assets.map((asset) => {
          const src = asset.media?.poster ?? asset.media?.src;
          return (
            <button
              key={asset.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(ITEM_DRAG_TYPE, asset.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onPick(asset)}
              className="overflow-hidden rounded-[8px] border border-border text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-foreground"
            >
              {src && <img src={src} alt="" draggable={false} className="aspect-video w-full object-cover bg-muted" />}
              <span className="block truncate px-2 py-1.5 text-[12px]">{asset.label}</span>
            </button>
          );
        })}
        {assets.length === 0 && <p className="col-span-2 text-[13px] text-muted-foreground">No files yet.</p>}
      </div>
    </aside>
  );
}
