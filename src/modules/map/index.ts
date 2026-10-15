export { MapGrid } from './components/MapGrid';
export { AnimatedMonster } from './components/AnimatedMonster';
export { RESOURCE_SPRITES } from './components/TileResources';
export { DECORATION_SCENARIO_KEYS, DECORATION_LAYOUTS_CONFIG_PATH } from './decoration-layouts.types';
export type {
  DecorationInstance,
  DecorationLayout,
  DecorationLayoutsConfig,
  DecorationScenarioKey,
} from './decoration-layouts.types';
export { default as decorationLayoutsConfig } from './decoration-layouts.config.json';

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
