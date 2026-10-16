export { MapGrid } from './components/MapGrid';
export { AnimatedMonster } from './components/AnimatedMonster';
export { RESOURCE_SPRITES, toTileResourcesViewModel } from './components/TileResources';
export { DECORATION_SCENARIO_KEYS, DECORATION_LAYOUTS_CONFIG_PATH } from './decoration-layouts.types';
export type {
  DecorationInstance,
  DecorationLayout,
  DecorationLayoutsConfig,
  DecorationScenarioKey,
} from './decoration-layouts.types';
export { default as decorationLayoutsConfig } from './decoration-layouts.config.json';

// Dev/test-only: the locked slot-table constants and their editable-draft type, consumed by the
// testbed's Default-elements editor mode. Not used by production game UI (which imports these
// from island-tile-slots.types.ts directly through the components that render them).
export {
  ISLAND_TILE_SLOTS_PATH,
  OCCUPANT_CORNER_SLOTS,
  BOAT_CORNER_POSITIONS,
  CORNER_TRANSFORMS,
  OCCUPANT_SIZE,
  BOAT_SIZE,
  SPECIAL_ISLAND_TOP,
  SPECIAL_ISLAND_LEFT,
  SPECIAL_ISLAND_SIZE,
  BASE_CREST_SIZE,
  BASE_CREST_MIN_PX,
  SINGLE_RESOURCE_SLOT,
  DUAL_RESOURCE_SLOTS,
  TRIPLE_RESOURCE_SLOTS,
  QUAD_RESOURCE_SLOTS,
  BASE_RESOURCE_SLOTS,
} from './island-tile-slots.types';
export type { CornerId, CornerPosition, SlotDef, IslandTileSlotsDraft } from './island-tile-slots.types';
export { COLLECTOR_IDLE_SPRITES } from './components/TileBoats';
export { SPECIAL_ISLAND_IDLE_SPRITE } from './components/IslandTile';

// Dev/test-only: IslandTile preview and fixture helpers, consumed by the testbed.
// Not used by production game UI.
export { IslandTileView } from './components/IslandTile';
export type { IslandTileViewModel } from './components/IslandTile';
export { createBaseViewModel, createViewModel } from './components/IslandTile/IslandTile.preview.shared';
export {
  cornerOccupants4,
  labGameStateFixture,
  localPlayerFixture,
  monsterIslandWithLivingMonster,
} from './components/IslandTile/IslandTile.fixtures';
