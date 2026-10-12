'use client';

import type { ReactNode } from 'react';
import { TileResourcesView } from './TileResources';
import { resourceIslandWithTwoDistinctResources, singleNodeFixture } from './TileResources.fixtures';
import { toTileResourcesViewModel } from './TileResources.map';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { ResourceNodeViewModel } from './TileResources.types';
import { ResourceType } from '@/lib/types';
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
      size: '37.9%',
      side: 'right',
    },
  },
];

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
