'use client';

import { TileOccupantsView } from './TileOccupants';
import { occupantSpriteFixture, fadedOccupantFixture } from './TileOccupants.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { OccupantSpriteViewModel } from './TileOccupants.types';
import { PlayerColor } from '@/lib/types';

const threeOccupantsFixture: OccupantSpriteViewModel[] = [
  occupantSpriteFixture,
  fadedOccupantFixture,
  {
    key: 'army-sprite-2-15',
    color: PlayerColor.Purple,
    sprite: '/sprites/player_purple.gif',
    positionClasses: 'absolute w-1/2 h-1/2 origin-top-right',
    isFaded: false,
  },
];

const allFadedFixture: OccupantSpriteViewModel[] = [
  {
    key: 'army-sprite-0-1',
    color: PlayerColor.Blue,
    sprite: '/sprites/player_blue.gif',
    positionClasses: 'absolute w-1/2 h-1/2 origin-bottom-left',
    isFaded: true,
  },
  {
    key: 'army-sprite-1-2',
    color: PlayerColor.Red,
    sprite: '/sprites/player_red.gif',
    positionClasses: 'absolute w-1/2 h-1/2 origin-bottom-right',
    isFaded: true,
  },
];

export const tileOccupantsPreview: ComponentPreview = {
  slug: 'tile-occupants',
  title: 'Tile Occupants',
  group: 'Game map',
  states: [
    {
      name: 'Empty (no occupants)',
      render: () => <TileOccupantsView occupants={[]} />,
    },
    {
      name: 'Single occupant',
      render: () => <TileOccupantsView occupants={[occupantSpriteFixture]} />,
    },
    {
      name: 'Two occupants',
      render: () => <TileOccupantsView occupants={[occupantSpriteFixture, fadedOccupantFixture]} />,
    },
    {
      name: 'Three occupants mixed',
      render: () => <TileOccupantsView occupants={threeOccupantsFixture} />,
    },
    {
      name: 'All faded',
      render: () => <TileOccupantsView occupants={allFadedFixture} />,
    },
  ],
};
