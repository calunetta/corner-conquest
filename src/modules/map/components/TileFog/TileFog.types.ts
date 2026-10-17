export interface TileFogProps {
  /** True while the tile is undiscovered. The fog plays while covered and fades out once the tile is revealed. */
  isCovered: boolean;
  prefersReducedMotion: boolean;
  /** Stable per-tile number (e.g. from the island's coordinates) that picks the fog variant. */
  variantSeed: number;
}
