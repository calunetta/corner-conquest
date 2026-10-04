import type { Island } from '@/lib/types';
import { IslandType, PlayerColor } from '@/lib/types';
import type { OccupantSpriteViewModel } from './TileOccupants.types';

export const islandWithOccupant: Island = {
  id: 'occupied-1',
  x: 1,
  y: 1,
  type: IslandType.Empty,
  resources: [],
  occupants: [{ playerId: 0, armyId: 5 }],
  positionedBy: [],
};

export const islandWithMultipleOccupants: Island = {
  id: 'occupied-multiple-1',
  x: 2,
  y: 2,
  type: IslandType.Base,
  owner: 0,
  resources: [],
  occupants: [
    { playerId: 0, armyId: 5 },
    { playerId: 1, armyId: 10 },
  ],
  positionedBy: [],
};

export const occupantSpriteFixture: OccupantSpriteViewModel = {
  key: 'army-sprite-0-5',
  color: PlayerColor.Blue,
  sprite: '/sprites/player_blue.gif',
  positionClasses: 'absolute w-1/2 h-1/2 origin-bottom-left',
  isFaded: false,
};

export const fadedOccupantFixture: OccupantSpriteViewModel = {
  key: 'army-sprite-1-10',
  color: PlayerColor.Red,
  sprite: '/sprites/player_red.gif',
  positionClasses: 'absolute w-1/2 h-1/2 origin-bottom-right',
  isFaded: true,
};
