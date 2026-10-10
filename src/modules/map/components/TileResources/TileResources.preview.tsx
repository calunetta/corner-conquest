'use client';

import { TileResourcesView } from './TileResources';
import { resourceIslandWithTwoDistinctResources, singleNodeFixture } from './TileResources.fixtures';
import { toTileResourcesViewModel } from './TileResources.map';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { ResourceNodeViewModel } from './TileResources.types';
import { ResourceType } from '@/lib/types';

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
    nodeSize: 67,
    slotStyle: { top: '46%', left: '50%', transform: 'translateX(-50%)' },
    farmingCollector: {
      color: 'blue',
      sprite: '/sprites/farm_blue.gif',
      size: 25,
      side: 'right',
      offset: -2,
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
      render: () => <TileResourcesView nodes={[singleNodeFixture]} />,
    },
    {
      name: 'Multiple resources',
      render: () => <TileResourcesView nodes={multipleResourceNodes} />,
    },
    {
      name: 'Resource with collector',
      render: () => <TileResourcesView nodes={withCollectorNode} />,
    },
    {
      name: 'No resources',
      render: () => <TileResourcesView nodes={null} />,
    },
  ],
};
