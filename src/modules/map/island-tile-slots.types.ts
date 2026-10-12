// Single source of truth for every island-tile sprite-placement coordinate.
// All percent values are % of the tile's own side length T. Corner-clearance rule (see
// ui-design.md): a non-corner slot must clear the 0-22%/78-100% band on at least one axis
// for every corner it is near. 22% = the boat's 21% half-box + a 1-point visible gap.

export type CornerId = 'br' | 'tr' | 'tl' | 'bl';

export interface CornerPosition {
  id: CornerId;
  /** Always exactly two of these four keys, each '0'. */
  style: Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;
}

/** Order is load-bearing: TileOccupants.hook.ts reads this directly so occupant index N
 *  always lands on the same corner as boat entry index N. Do not reorder. */
export const BOAT_CORNER_POSITIONS: CornerPosition[] = [
  { id: 'br', style: { bottom: '0', right: '0' } },
  { id: 'tr', style: { top: '0', right: '0' } },
  { id: 'tl', style: { top: '0', left: '0' } },
  { id: 'bl', style: { bottom: '0', left: '0' } },
];

/** Centers an element on its tile corner point: half of its own box overhangs past the
 *  tile edge regardless of the element's size (boat 42% of T, rider 29% of T). */
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
  top: '65.5%',
  left: '50%',
  size: 39,
};

// left/right corrected 14% -> 24% to clear the boat corner band (was the one coordination
// gap the triage flagged: these slots were never checked against the boat corners).
export const DUAL_RESOURCE_SLOTS: SlotDef[] = [
  { top: '36%', left: '40%', size: 32 },
  { top: '86%', left: '60%', size: 32 },
];

// Slot 1's left corrected 12% -> 24% (same gap as above); slots 2-3 already clear by their
// vertical offset (46%/70% fall outside the 0-22%/78-100% bands) and are unchanged.
export const TRIPLE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '33.5%', left: '37.5%', size: 27 },
  { top: '59.5%', left: '74.5%', size: 27 },
  { top: '83.5%', left: '25.5%', size: 27 },
];

// Edge-midpoint slots keep clear of the boat and occupant corner anchors. Unchanged.
export const BASE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '15%', left: '50%', size: 22 },
  { top: '85%', left: '35%', size: 22 },
  { top: '85%', left: '65%', size: 22 },
];

export interface TreeSlot {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  /** Percent of the tile's own side length T, except the Special slot's '4px' top/left. */
  size: string;
  z: number;
}

// Unchanged: kept inside the gap between the top-left boat corner (0-21% of T) and the base
// crest/top resource slot, so trees never sit under the resource icons.
export const BASE_FOREST_SLOTS: TreeSlot[] = [
  { top: '2%', left: '23%', size: '15%', z: 12 },
  { top: '11%', left: '23%', size: '15%', z: 14 },
];

// Unchanged: single decorative slot, not corner-adjacent.
export const SPECIAL_FOREST_SLOT: TreeSlot[] = [{ top: '4px', left: '4px', size: '16%', z: 12 }];

// Trees 1 and 2's left/right corrected 22% -> 24% to clear the boat corner band; tree 3
// (bottom:26%, left:44%) was already clear and is unchanged.
export const EMPTY_GROVE_SLOTS: TreeSlot[] = [
  { top: '18%', left: '24%', size: '28%', z: 12 },
  { top: '24%', right: '24%', size: '28%', z: 14 },
  { bottom: '26%', left: '44%', size: '28%', z: 13 },
];
