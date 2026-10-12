'use client';

import type { ReactNode } from 'react';
import { TileResourcesView } from './TileResources';
import {
  baseIslandWithResources,
  resourceIslandWithDualResources,
  resourceIslandWithTwoDistinctResources,
  singleNodeFixture,
} from './TileResources.fixtures';
import { toTileResourcesViewModel } from './TileResources.map';
import { buildPlayer } from '../../board-context.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { ResourceNodeViewModel } from './TileResources.types';
import { PlayerColor, ResourceType } from '@/lib/types';
import type { Island } from '@/lib/types';
import { useIsMobile } from '@/modules/shared';

/** Square stand-in for IslandTile's `relative aspect-square` tile, sized with the same clamp()
 *  ranges MapGrid uses, so the percent-of-tile sizing resolves against a realistic box. */
function TileBox({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const side = isMobile ? 'clamp(46px, 13.5vw, 68px)' : 'clamp(94px, 12.5vh, 136px)';

  return (
    <div
      className="relative rounded-lg border border-dashed border-white/40"
      style={{ width: side, aspectRatio: '1 / 1' }}
    >
      {children}
    </div>
  );
}

// Built through the real map so the preview shows the same DUAL_RESOURCE_SLOTS placement
// (top 20% / top 70%) the game renders, instead of hand-written slot literals.
const multipleResourceNodes: ResourceNodeViewModel[] = toTileResourcesViewModel(
  resourceIslandWithTwoDistinctResources,
  false,
  [],
) ?? [];

const withCollectorNode: ResourceNodeViewModel[] = [
  {
    type: ResourceType.Food,
    key: 'resource-node-food-collector',
    spriteSrc: '/sprites/sheep.gif',
    nodeSize: '56.6%',
    slotStyle: { top: '46%', left: '50%', transform: 'translateX(-50%)' },
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
const dualFarmedNodes = farmedNodesFor(
  resourceIslandWithTwoDistinctResources,
  false,
  [ResourceType.Gold, ResourceType.Wood],
);

// 3 nodes: Gold fills TRIPLE slots [0] and [1], Wood fills [2] (tightest edge margin of the nine).
const tripleFarmedNodes = farmedNodesFor(
  resourceIslandWithDualResources,
  false,
  [ResourceType.Gold, ResourceType.Wood],
);

// BASE_RESOURCE_SLOTS[0] and [1] show a badge; [2] is unreachable with two resources (plan accepts).
const baseFarmedNodes = farmedNodesFor(
  baseIslandWithResources,
  true,
  [ResourceType.Food, ResourceType.Gold],
);

export const tileResourcesPreview: ComponentPreview = {
  slug: 'tile-resources',
  title: 'Tile Resources',
  group: 'Game map',
  states: [
    {
      name: 'Single food resource',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={[singleNodeFixture]} />
        </TileBox>
      ),
    },
    {
      name: 'Multiple resources',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={multipleResourceNodes} />
        </TileBox>
      ),
    },
    {
      name: 'Resource with collector',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={withCollectorNode} />
        </TileBox>
      ),
    },
    {
      name: 'Resource with collector, dual slots',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={dualFarmedNodes} />
        </TileBox>
      ),
    },
    {
      name: 'Resource with collector, triple slots',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={tripleFarmedNodes} />
        </TileBox>
      ),
    },
    {
      name: 'Base resource with collector',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={baseFarmedNodes} />
        </TileBox>
      ),
    },
    {
      // Mobile suppression: the connected TileResources passes showFarmingCollector={!isMobile},
      // so this is what a phone shows for the same node.
      name: 'Resource with collector, mobile (badge hidden)',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={withCollectorNode} showFarmingCollector={false} />
        </TileBox>
      ),
    },
    {
      name: 'No resources',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={null} />
        </TileBox>
      ),
    },
  ],
};
