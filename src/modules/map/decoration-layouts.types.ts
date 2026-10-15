// Single source of truth for an island's decorative sprite instances (trees today, any
// draggable decoration tomorrow). Replaces TileForest's TreeSlot tables: every instance is
// now CENTER-anchored (top/left = sprite's own center, % of the tile's side T), the same
// convention already used by the resource-node slots (island-tile-slots.types.ts:54-61), so a
// drag/arrow-nudge tool can clamp one pair of numbers per instance instead of juggling the old
// TreeSlot's "any two of top/bottom/left/right" shape.

export interface DecorationInstance {
  id: string;
  /** Public path, e.g. '/sprites/decorations/tree.gif'. */
  image: string;
  /** Sprite's own CENTER point, % of the tile's side T, 0-100 (view applies
   *  translate(-50%, -50%), same convention as the resource-node slots). */
  top: number;
  left: number;
  /** Box width/height, % of T. */
  size: number;
  /** Stacking order among decorations only; the container itself stays at the
   *  TileForest-era z-[12], always below TileBoats (z-25/26) and TileResources (z-28..35). */
  z: number;
}

export interface DecorationLayout {
  id: string;
  name: string;
  instances: DecorationInstance[];
}

export type DecorationScenarioKey =
  | 'base'
  | 'special'
  | 'empty-2'
  | 'empty-3'
  | 'resource-1'
  | 'resource-2'
  | 'resource-3'
  | 'resource-4'
  | 'monster-alive'
  | 'monster-cleared';

/** Every valid scenario key, in a fixed order; the editor's outer+inner Select controls and the
 *  config's own Record both key off exactly this set. */
export const DECORATION_SCENARIO_KEYS: readonly DecorationScenarioKey[] = [
  'base',
  'special',
  'empty-2',
  'empty-3',
  'resource-1',
  'resource-2',
  'resource-3',
  'resource-4',
  'monster-alive',
  'monster-cleared',
] as const;

export type DecorationLayoutsConfig = Record<DecorationScenarioKey, DecorationLayout[]>;

/** Repo-relative path of decoration-layouts.config.json, used by the save API route
 *  (`path.join(process.cwd(), DECORATION_LAYOUTS_CONFIG_PATH)`). */
export const DECORATION_LAYOUTS_CONFIG_PATH = 'src/modules/map/decoration-layouts.config.json';
