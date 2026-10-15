import { cva } from 'class-variance-authority';

/** Runtime-independent anchor: each sprite's box is centered on its top/left point. */
export const SPRITE_CENTER_TRANSFORM = 'translate(-50%, -50%)';

export const styles = {
  root: 'flex flex-col gap-6 md:flex-row md:items-start',
  panel: 'flex w-full flex-col gap-3 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md',
  railPanel: 'md:w-56 md:shrink-0',
  inspectorPanel: 'md:w-64 md:shrink-0',
  canvasColumn: 'flex flex-col items-center gap-3 md:min-w-[320px] md:flex-1',
  panelTitle: 'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
  label: 'text-xs font-medium text-muted-foreground',
  nameField: 'h-8 text-sm',
  fieldRow: 'flex flex-col gap-1',
  layoutScroll: 'max-h-64 overflow-y-auto',
  layoutList: 'flex flex-col gap-1.5',
  layoutRow: cva('flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', {
    variants: {
      isActive: {
        true: 'bg-primary/15 font-semibold text-foreground ring-1 ring-primary/40',
        false: 'text-muted-foreground hover:bg-white/5',
      },
    },
  }),
  actionRow: 'flex flex-wrap items-center gap-2',
  saveRow: 'flex flex-wrap items-center gap-2 border-t border-white/10 pt-3',
  unsavedBadge: 'text-accent',
  statusText: cva('text-xs transition-opacity duration-200 motion-reduce:transition-none', {
    variants: {
      status: {
        idle: 'opacity-0',
        saving: 'text-muted-foreground opacity-100',
        saved: 'text-accent opacity-100',
        error: 'text-destructive opacity-100',
      },
    },
  }),
  spinner: 'h-4 w-4 animate-spin motion-reduce:animate-none',
  tileFrame: 'relative w-full max-w-[360px] [&_[data-testid=tile-decorations]]:hidden',
  // z-[60]: above every other tile layer (TileResources' collector badge is the highest at
  // z-[35]), so a decoration stays clickable/draggable in the editor even where it would render
  // behind an occupant/boat/resource in the live game.
  decorationOverlay: 'pointer-events-none absolute inset-0.5 z-[60]',
  sprite: cva(
    'pointer-events-auto absolute cursor-grab touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
    {
      variants: {
        isSelected: {
          true: 'ring-2 ring-primary',
          false: '',
        },
      },
    },
  ),
  spriteImage: 'object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]',
  emptyHint: 'pointer-events-none absolute inset-0 z-[61] flex items-center justify-center rounded-lg border border-dashed border-white/30 p-4 text-center text-sm text-muted-foreground',
  imageGrid: 'grid grid-cols-4 gap-2',
  imageButton: 'relative aspect-square overflow-hidden rounded-md border border-white/10 bg-white/5 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  imageThumbnail: 'object-contain',
  fieldStack: 'flex flex-col gap-3',
  instanceFields: 'grid grid-cols-2 gap-2',
  icon: 'h-4 w-4',
  readout: 'font-mono text-xs text-muted-foreground',
  emptyText: 'text-sm text-muted-foreground',
  inlineAnchor: 'inline-flex',
  srOnly: 'sr-only',
} as const;
