// Every position, size and timing literal of the decorative Home Islands background.
// This file must never import the real board's locked slot tables. A number here that
// happens to equal one of them is a copied literal, tuned for the lobby on its own.

export interface NumberRange {
  min: number;
  max: number;
}

export const CLOUD_SPAWN = {
  maxConcurrent: 5,
  spawnIntervalMs: 2500,
  minDurationSeconds: 18,
  maxDurationSeconds: 28,
};

export const CLOUD_LEFT_PERCENT_RANGE: NumberRange = { min: 0, max: 90 };
export const CLOUD_TOP_PERCENT_RANGE: NumberRange = { min: 0, max: 45 };
export const CLOUD_SCALE_RANGE: NumberRange = { min: 0.6, max: 1 };

/** Rendered size of one cloud sprite, in px. */
export const CLOUD_SIZE = { width: 160, height: 64 };

/** Every island is this share of the container width and is kept square by the view. */
export const ISLAND_WIDTH_PERCENT = 26;

/** Three islands in one row: base on the left, resource in the centre, monster on the right. */
export const ISLAND_POSITIONS: Record<'base' | 'resource' | 'monster', { top: string; left: string }> = {
  base: { top: '40%', left: '4%' },
  resource: { top: '40%', left: '37%' },
  monster: { top: '40%', left: '70%' },
};

/** Slot order matches the resource types Food, Wood, Gold used by createResourceIslandNodes. */
export const RESOURCE_NODE_SLOTS: Array<{ top: string; left: string; sizePercent: number }> = [
  { top: '18%', left: '20%', sizePercent: 34 },
  { top: '52%', left: '18%', sizePercent: 34 },
  { top: '34%', left: '56%', sizePercent: 34 },
];
