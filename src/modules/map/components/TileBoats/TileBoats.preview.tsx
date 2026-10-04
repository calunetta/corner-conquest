'use client';

import { TileBoatsView } from './TileBoats';
import { boatEntryFixture } from './TileBoats.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { BoatEntryViewModel } from './TileBoats.types';
import { PlayerColor } from '@/lib/types';

const twoBoatsFixture: BoatEntryViewModel[] = [
  boatEntryFixture,
  {
    key: 'boat-base-1',
    color: PlayerColor.Red,
    cornerStyle: { top: '2px', right: '2px' },
    showIdleCollector: false,
    idleCollectorSprite: undefined,
  },
];

const allCornersBoatsFixture: BoatEntryViewModel[] = [
  {
    key: 'boat-br',
    color: PlayerColor.Blue,
    cornerStyle: { bottom: '2px', right: '2px' },
    showIdleCollector: true,
    idleCollectorSprite: '/sprites/collector_blue_idle.gif',
  },
  {
    key: 'boat-tr',
    color: PlayerColor.Red,
    cornerStyle: { top: '2px', right: '2px' },
    showIdleCollector: false,
    idleCollectorSprite: undefined,
  },
  {
    key: 'boat-tl',
    color: PlayerColor.Purple,
    cornerStyle: { top: '2px', left: '2px' },
    showIdleCollector: true,
    idleCollectorSprite: '/sprites/collector_purple_idle.gif',
  },
  {
    key: 'boat-bl',
    color: PlayerColor.Yellow,
    cornerStyle: { bottom: '2px', left: '2px' },
    showIdleCollector: false,
    idleCollectorSprite: undefined,
  },
];

export const tileBoatsPreview: ComponentPreview = {
  slug: 'tile-boats',
  title: 'Tile Boats',
  group: 'Game map',
  states: [
    {
      name: 'Empty (no boats)',
      render: () => <TileBoatsView boats={null} />,
    },
    {
      name: 'Single boat',
      render: () => <TileBoatsView boats={[boatEntryFixture]} />,
    },
    {
      name: 'Two boats',
      render: () => <TileBoatsView boats={twoBoatsFixture} />,
    },
    {
      name: 'All four corners',
      render: () => <TileBoatsView boats={allCornersBoatsFixture} />,
    },
  ],
};
