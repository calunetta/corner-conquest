// Single source of truth for every island-tile sprite-placement coordinate AND size (the
// few sizes not already expressed as a SlotDef's own `size` are the SPRITE SIZES block below).
// All percent values are % of the tile's own side length T. Corner-clearance rule (see
// ui-design.md): a non-corner slot must clear the 0-22%/78-100% band on at least one axis
// for every corner it is near. 22% = the boat's 21% half-box + a 1-point visible gap.

// Dev-only: the path the Default-elements editor mode (testbed) reads/writes to persist edits
// to this file's own exports (`path.join(process.cwd(), ISLAND_TILE_SLOTS_PATH)`), mirroring
// DECORATION_LAYOUTS_CONFIG_PATH's pattern (decoration-layouts.types.ts).
export const ISLAND_TILE_SLOTS_PATH = 'src/modules/map/island-tile-slots.types.ts';

export type CornerId = 'br' | 'tr' | 'tl' | 'bl';

export interface CornerPosition {
  id: CornerId;
  /** Always exactly two of these four keys set. */
  style: Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;
}

/** Order is load-bearing: OCCUPANT_CORNER_SLOTS must keep the same order, so occupant index N
 *  lands on the same corner as boat entry index N. Do not reorder. */
export const BOAT_CORNER_POSITIONS: CornerPosition[] = [
  { id: 'br', style: { bottom: '0', right: '0' } },
  { id: 'tr', style: { top: '0', right: '0' } },
  { id: 'tl', style: { top: '0', left: '0' } },
  { id: 'bl', style: { bottom: '0', left: '0' } },
];

/** Knight (occupant) anchors, same order as BOAT_CORNER_POSITIONS. Each knight is offset 24%
 *  in from its boat's corner and flush-anchored by its two edges, so it sits beside its boat
 *  without overlapping the boat's hull box. No transform: nothing is centered on the corner. */
export const OCCUPANT_CORNER_SLOTS: CornerPosition[] = [
  { id: 'br', style: { bottom: '-1%', right: '-5%' } },
  { id: 'tr', style: { top: '-20%', right: '-5%' } },
  { id: 'tl', style: { top: '-20%', left: '-5%' } },
  { id: 'bl', style: { bottom: '-1%', left: '-5%' } },
];

/** Centers an element on its tile corner point: half of its own box overhangs past the
 *  tile edge regardless of the element's size (boat 42% of T). */
export const CORNER_TRANSFORMS: Record<CornerId, string> = {
  br: 'translate(50%, 50%)',
  tr: 'translate(50%, -50%)',
  tl: 'translate(-50%, -50%)',
  bl: 'translate(-50%, 50%)',
};

export interface SlotDef {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
  /** Percent of the tile's own side length T; reference size for the node box and the
   *  collector-badge formula. */
  size: number;
}

// top/left are always the node's CENTER point, not a corner: TileResourcesView centers every
// node on it with transform: translate(-50%, -50%). This is load-bearing, not cosmetic — the
// Food sprite's box is inflated 1.45x (FOOD_SCALE, TileResources.map.ts) to compensate its
// transparent canvas padding, and a corner-anchored box grows only away from its anchor, so a
// slot anchored near an edge (e.g. the old `top: '70%'`) pushed an inflated Food node's visible
// center most of the way off the tile. Centering keeps growth symmetric around the same point
// in every direction, which is also why these are the exact centers the old edge-anchored
// values resolved to (top' = top + size/2, etc.) — unscaled (Wood/Gold) placement is unchanged.
export const SINGLE_RESOURCE_SLOT: SlotDef = {
  top: '50%',
  left: '50%',
  size: 40,
};

// left/right corrected 14% -> 24% to clear the boat corner band (was the one coordination
// gap the triage flagged: these slots were never checked against the boat corners).
export const DUAL_RESOURCE_SLOTS: SlotDef[] = [
  { top: '20%', left: '50%', size: 40 },
  { top: '55%', left: '60%', size: 40 },
];

// Slot 1's left corrected 12% -> 24% (same gap as above); slots 2-3 already clear by their
// vertical offset (46%/70% fall outside the 0-22%/78-100% bands) and are unchanged.
export const TRIPLE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '20%', left: '45%', size: 40 },
  { top: '45%', left: '75%', size: 40 },
  { top: '55%', left: '35%', size: 40 },
];

// PLACEHOLDER: a resource island can hold up to 4 individual nodes (2 resource types x amount
// 2 each, see generateIslandTerrain in map-generation.ts), but getSlot() in TileResources.map.ts
// previously fell through to TRIPLE_RESOURCE_SLOTS for any total >= 3, so a 4th node silently
// stacked on slot [0] via idx % 3. This table and the total === 4 branch fix that overlap; the
// positions below are an untuned starting grid, not final.
export const QUAD_RESOURCE_SLOTS: SlotDef[] = [
  { top: '20%', left: '35%', size: 40 },
  { top: '25%', left: '70%', size: 40 },
  { top: '50%', left: '30%', size: 40 },
  { top: '60%', left: '80%', size: 40 },
];

// ---- SPRITE SIZES ----
// The few sizes not already expressed as a SlotDef's own `size`. Percent is of the tile side T
// unless noted otherwise. Consumers apply these as inline styles (not Tailwind classes), since
// Tailwind can't generate CSS for a class built from a JS variable — only from a literal string
// in source — so this is the one place to edit every knight/boat/collector/base/special-island size.
export const OCCUPANT_SIZE = 43; // knight box width/height, % of T
export const BOAT_SIZE = 42; // boat box width/height, % of T
export const IDLE_COLLECTOR_SIZE = 75; // idle-in-boat collector width/height, % of the boat's own box
export const IDLE_COLLECTOR_TOP = 40; // idle-in-boat collector's vertical center, % of the boat's own box (horizontally centered)
export const FARMING_BADGE_SIZE_RATIO = 1.1; // farming badge size, fraction of the resource node's own (uninflated) box
export const MONSTER_SPRITE_SIZE_PX = 64; // monster sprite width/height in px (fixed, not % of T — see AnimatedMonster.tsx)
export const BOSS_MONSTER_SCALE = 15; // boss monsters are drawn this many times the regular monster sprite size
export const BASE_CREST_SIZE = 44; // base tile's player-crest box width/height, % of T
export const BASE_CREST_MIN_PX = 18; // base crest's floor, so it stays legible at small tile sizes
export const SPECIAL_ISLAND_SIZE = 35; // special island's idle-art box width/height, % of the tile's padded content box
// Special island's center point, same top/left-is-center convention as the resource slots above
// (consumer centers on it with transform: translate(-50%, -50%)). Currently dead center; edit to move it.
export const SPECIAL_ISLAND_TOP = '40%';
export const SPECIAL_ISLAND_LEFT = '50%';
export const BORDER_DECORATION_WIDTH_PX = 40; // each castle-border image's box width, px (fixed, not % of T)
export const BORDER_DECORATION_HEIGHT_PX = 20; // each castle-border image's box height, px (fixed, not % of T)
export const BORDER_DECORATION_BOTTOM_OFFSET_PX = -11; // border row's offset below the tile's bottom edge, px

// Edge-midpoint slots keep clear of the boat and occupant corner anchors. Unchanged.
export const BASE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '60%', left: '20%', size: 30 },
  { top: '45%', right: '-17%', size: 30 },
  { top: '15%', left: '50%', size: 30 },
];

/** The editable subset of this file's own exports: every value the Default-elements editor
 *  mode can drag/nudge/resize. CORNER_TRANSFORMS is deliberately absent — it is derived per
 *  corner, never user-tuned. */
export interface IslandTileSlotsDraft {
  occupantCornerSlots: CornerPosition[]; // 4, same br/tr/tl/bl order as today
  boatCornerPositions: CornerPosition[]; // 4, same order
  occupantSize: number;
  boatSize: number;
  specialIslandTop: string; // e.g. '40%'
  specialIslandLeft: string;
  specialIslandSize: number;
  baseCrestSize: number;
  baseCrestMinPx: number;
  singleResourceSlot: SlotDef;
  dualResourceSlots: SlotDef[];
  tripleResourceSlots: SlotDef[];
  quadResourceSlots: SlotDef[];
  baseResourceSlots: SlotDef[];
}

