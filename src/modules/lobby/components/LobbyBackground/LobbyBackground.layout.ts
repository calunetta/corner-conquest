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

/** Knight standing on the base island, in front of the castle. Percentages are of the island box. */
export const KNIGHT_SIZE_PERCENT = 22;
export const KNIGHT_POSITION: { top: string; left: string } = { top: '66%', left: '62%' };

/** Monster sprite width and height as a share of its island box. */
export const MONSTER_SIZE_PERCENT = 45;
/** Top-left corner of the monster sprite box, in % of its island box. 27.5 = (100 - 45) / 2 centres it. */
export const MONSTER_POSITION: { top: string; left: string } = { top: '27.5%', left: '27.5%' };
/** Each wander step shifts the monster by this many percent of its own sprite width. */
export const MONSTER_WANDER_OFFSET_RANGE: NumberRange = { min: -15, max: 15 };
/** Milliseconds between wander steps; one value is drawn on mount and kept for the session. */
export const MONSTER_WANDER_INTERVAL_MS: NumberRange = { min: 3000, max: 5500 };
/** Chance per step that the monster shows its attack pose instead of wandering. */
export const MONSTER_ATTACK_CHANCE = 0.25;
