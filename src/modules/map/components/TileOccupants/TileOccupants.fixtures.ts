import type { Island, Player, GameState } from '@/lib/types';
import { IslandType, PlayerColor } from '@/lib/types';
import type { OccupantSpriteViewModel } from './TileOccupants.types';
import { buildPlayer, buildGameState } from '../../board-context.fixtures';

export const bluePlayer: Player = buildPlayer({
  id: 0,
  playerId: 'p0',
  color: PlayerColor.Blue,
  revealedTiles: ['0-0', '1-1'],
});

export const redPlayer: Player = buildPlayer({
  id: 1,
  playerId: 'p1',
  color: PlayerColor.Red,
  revealedTiles: ['1-1'],
});

export const gameStateFixture: GameState = buildGameState({
  players: [bluePlayer, redPlayer],
  map: [],
  settings: {
    victoryPointGoal: 30,
    fogOfWar: false,
    upgradeCost: 5,
    abilityCost: 3,
    baseResourceAmount: 1,
    availableAbilities: [],
  } as unknown as GameState['settings'],
});

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
