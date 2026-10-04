'use client';

import { TileResourcesView } from './TileResources';
import { singleNodeFixture } from './TileResources.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { ResourceNodeViewModel } from './TileResources.types';
import { ResourceType } from '@/lib/types';

const multipleResourceNodes: ResourceNodeViewModel[] = [
  singleNodeFixture,
  {
    type: ResourceType.Gold,
    key: 'resource-node-gold-0',
    spriteSrc: '/sprites/gold.gif',
    nodeSize: 67,
    slotStyle: { bottom: '20%', right: '50%', transform: 'translateX(50%)' },
    farmingCollector: null,
  },
  {
    type: ResourceType.Wood,
    key: 'resource-node-wood-0',
    spriteSrc: '/sprites/wood.gif',
    nodeSize: 67,
    slotStyle: { bottom: '40%', left: '20%' },
    farmingCollector: null,
  },
];

const withCollectorNode: ResourceNodeViewModel[] = [
  {
    type: ResourceType.Food,
    key: 'resource-node-food-collector',
    spriteSrc: '/sprites/sheep.gif',
    nodeSize: 67,
    slotStyle: { top: '20%', left: '50%', transform: 'translateX(-50%)' },
    farmingCollector: {
      color: 'blue',
      sprite: '/sprites/collector_blue_idle.gif',
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
