import { IslandType, ResourceType } from '@/lib/types';
import type { Island, IslandResource } from '@/lib/types';
import type { DecorationScenarioKey } from '@/modules/map';
import {
  cornerOccupants4,
  localPlayerFixture,
  monsterIslandWithLivingMonster,
} from '@/modules/map';

const REFERENCE_ISLAND_ID = 'decoration-editor-reference';
const REFERENCE_COORDS = { x: 2, y: 2 };

/** Splits a node count across food and wood so each resource-N scenario shows N resource nodes. */
function resourcesForNodeCount(nodeCount: number): IslandResource[] {
  const resources: IslandResource[] = [
    { type: ResourceType.Food, amount: Math.ceil(nodeCount / 2) },
    { type: ResourceType.Wood, amount: Math.floor(nodeCount / 2) },
  ];
  return resources.filter((resource) => resource.amount > 0);
}

const baseIsland: Island = {
  id: REFERENCE_ISLAND_ID,
  ...REFERENCE_COORDS,
  type: IslandType.Base,
  owner: localPlayerFixture.id,
  resources: [],
  occupants: [],
};

const specialIsland: Island = { ...baseIsland, type: IslandType.Special, owner: undefined };

const emptyIsland: Island = { ...baseIsland, type: IslandType.Empty, owner: undefined, occupants: cornerOccupants4 };

function resourceIsland(nodeCount: number): Island {
  return {
    ...emptyIsland,
    type: IslandType.Resource,
    resources: resourcesForNodeCount(nodeCount),
  };
}

const monsterAliveIsland: Island = { ...monsterIslandWithLivingMonster, id: REFERENCE_ISLAND_ID };
const monsterClearedIsland: Island = { ...monsterAliveIsland, monsters: [] };

/** One reference tile per scenario/variant, so the canvas shows the same node count, island
 *  type and occupant corners as the layout being edited. Decorations are drawn by the editor,
 *  not by this island. */
const REFERENCE_ISLANDS: Record<DecorationScenarioKey, Island> = {
  base: baseIsland,
  special: specialIsland,
  'empty-2': emptyIsland,
  'empty-3': emptyIsland,
  'resource-1': resourceIsland(1),
  'resource-2': resourceIsland(2),
  'resource-3': resourceIsland(3),
  'resource-4': resourceIsland(4),
  'monster-alive': monsterAliveIsland,
  'monster-cleared': monsterClearedIsland,
};

/** The realistic tile the editor's canvas draws behind the decorations for a scenario/variant. */
export function toReferenceIsland(scenarioKey: DecorationScenarioKey): Island {
  return REFERENCE_ISLANDS[scenarioKey];
}

/** The last path segment of a public image path, e.g. 'tree.gif' for '/sprites/decorations/tree.gif'. */
export function toFileName(imagePath: string): string {
  return imagePath.slice(imagePath.lastIndexOf('/') + 1);
}
