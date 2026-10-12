import {
  baseIslandWithResources,
  resourceIslandWithDualResources,
  resourceIslandWithTwoDistinctResources,
  resourceIslandWithFourNodes,
} from './TileResources.fixtures';
import { toTileResourcesViewModel } from './TileResources.map';
import { buildPlayer } from '../../board-context.fixtures';
import type { ResourceNodeViewModel } from './TileResources.types';
import { PlayerColor, ResourceType } from '@/lib/types';
import type { Island } from '@/lib/types';

/** Resource-node view models for TileResources.preview.tsx's states, split out to stay under
 *  max-lines. Built through the real map so previews show the same slot placement the game
 *  renders, instead of hand-written slot literals. */

// Built through the real map so the preview shows the same DUAL_RESOURCE_SLOTS placement
// (top 20% / top 70%) the game renders, instead of hand-written slot literals.
export const multipleResourceNodes: ResourceNodeViewModel[] = toTileResourcesViewModel(
  resourceIslandWithTwoDistinctResources,
  false,
  [],
) ?? [];

export const withCollectorNode: ResourceNodeViewModel[] = [
  {
    type: ResourceType.Food,
    key: 'resource-node-food-collector',
    spriteSrc: '/sprites/sheep.gif',
    nodeSize: '56.6%',
    slotStyle: { top: '65.5%', left: '50%' },
    farmingCollector: {
      color: 'blue',
      sprite: '/sprites/farm_blue.gif',
      size: '44.8%',
    },
  },
];

// Owner seat for the farmed previews below: toTileResourcesViewModel only draws a badge when
// the resource's positionedBy player exists in this list.
const farmingPlayers = [buildPlayer({ id: 0, playerId: 'p0', color: PlayerColor.Blue })];

/** Builds nodes for `island` with every listed resource farmed by seat 0, so each node of those
 *  types shows a badge. Overrides positionedBy locally; shared fixtures stay unchanged. */
function farmedNodesFor(
  island: Island,
  isBase: boolean,
  farmedResources: ResourceType[],
): ResourceNodeViewModel[] {
  const positionedBy = farmedResources.map((resource) => ({ playerId: 0, resource }));
  return toTileResourcesViewModel({ ...island, positionedBy }, isBase, farmingPlayers) ?? [];
}

// resourceIslandWithTwoDistinctResources expands to 2 nodes: both DUAL_RESOURCE_SLOTS show a badge.
export const dualFarmedNodes = farmedNodesFor(
  resourceIslandWithTwoDistinctResources,
  false,
  [ResourceType.Gold, ResourceType.Wood],
);

// 3 nodes: Gold fills TRIPLE slots [0] and [1], Wood fills [2] (tightest edge margin of the nine).
export const tripleFarmedNodes = farmedNodesFor(
  resourceIslandWithDualResources,
  false,
  [ResourceType.Gold, ResourceType.Wood],
);

// BASE_RESOURCE_SLOTS[0] and [1] show a badge; [2] is unreachable with two resources (plan accepts).
export const baseFarmedNodes = farmedNodesFor(
  baseIslandWithResources,
  true,
  [ResourceType.Food, ResourceType.Gold],
);

// The real max: 2 types x amount 2 = 4 nodes, filling all of QUAD_RESOURCE_SLOTS.
export const quadNodes: ResourceNodeViewModel[] = toTileResourcesViewModel(resourceIslandWithFourNodes, false, []) ?? [];

export const quadFarmedNodes = farmedNodesFor(resourceIslandWithFourNodes, false, [ResourceType.Food, ResourceType.Wood]);
