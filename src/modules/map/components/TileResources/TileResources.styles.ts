export const styles = {
  container: 'pointer-events-none absolute inset-0 z-[28] select-none',
  nodeSlot: 'absolute flex flex-col items-center justify-center',
  resourceSprite: 'relative w-full h-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)] transition-transform hover:scale-110',
  // Reduced-motion stand-in for the GIF: a ring on the node while the gain is active. Box-shadow only, no layout change.
  resourceSpriteGain: 'motion-reduce:rounded-full motion-reduce:ring-2 motion-reduce:ring-accent',
  image: 'h-full w-full object-contain',
  // Covers the node's own box, not the tile. Sits above the sprite (z-[28] container order) and below the collector badge (z-[35]).
  gainOverlay: 'pointer-events-none absolute inset-0 z-[32] motion-reduce:hidden',
  gainImage: 'object-contain',
  collectorOverlay: 'absolute z-[35] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]',
  collectorImage: 'h-full w-full object-contain',
} as const;
