import { IslandType } from '@/lib/types';
import type { Island } from '@/lib/types';
import decorationLayoutsConfig from '../../decoration-layouts.config.json';
import type {
  DecorationLayout,
  DecorationLayoutsConfig,
  DecorationScenarioKey,
} from '../../decoration-layouts.types';

// A resource island tops out at 4 individual nodes (2 resource types x amount 2 each, see
// generateIslandTerrain in map-generation.ts); clamp mirrors TileResources.map.ts's getSlot
// total>=4 -> QUAD_RESOURCE_SLOTS fallback so a 5th-and-up node still resolves to a real scenario.
const MAX_RESOURCE_NODES = 4;

export function toScenarioKey(island: Island, isBase: boolean): DecorationScenarioKey {
  if (isBase) {
    return 'base';
  }

  if (island.type === IslandType.Special) {
    return 'special';
  }

  if (island.type === IslandType.Monster) {
    const isAlive = !!island.monsters && island.monsters.length > 0;
    return isAlive ? 'monster-alive' : 'monster-cleared';
  }

  if (island.type === IslandType.Resource) {
    const total = island.resources.reduce((sum, resource) => sum + resource.amount, 0);
    const nodeCount = Math.max(1, Math.min(total, MAX_RESOURCE_NODES));
    return `resource-${nodeCount}` as DecorationScenarioKey;
  }

  // Empty or Cleared Island: natural lush tree grove, 2 or 3 trees by seed parity.
  const seed = Math.abs(island.x * 7 + island.y * 13);
  return seed % 2 === 0 ? 'empty-2' : 'empty-3';
}

/** The default decoration layouts, shared by every variant that has none of its own. */
export const DECORATION_LAYOUTS_DEFAULT = decorationLayoutsConfig as DecorationLayoutsConfig;

export function toDecorationLayout(
  island: Island,
  isBase: boolean,
  config: DecorationLayoutsConfig = DECORATION_LAYOUTS_DEFAULT,
): DecorationLayout {
  const scenarioKey = toScenarioKey(island, isBase);
  const layouts = config[scenarioKey];
  const seed = Math.abs(island.x * 7 + island.y * 13 + (isBase ? 3 : 0));
  return layouts[seed % layouts.length];
}
