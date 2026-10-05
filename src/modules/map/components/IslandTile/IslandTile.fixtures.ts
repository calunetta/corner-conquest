import type { Army, GameState, Island, Player } from '@/lib/types';
import { IslandType, PlayerColor, ResourceType } from '@/lib/types';
import { initialUIState } from '@/modules/game-board';
import type { GameBoardUIState } from '@/modules/game-board';
import { buildPlayer, buildGameState } from '../../board-context.fixtures';
import type { IslandTileContext } from './IslandTile.types';

const GRID_SIZE = 5;

const BASE_SETTINGS = {
  victoryPointGoal: 30, vpPerIslandDiscovery: 1, initialDeployCost: 2, deployCostIncrement: 1,
  upgradeCost: 2, abilityCost: 10, baseResourceAmount: 1, resourceDensity: 0.5,
  availableCards: [], availableAbilities: [], fogOfWar: true, gridSize: { rows: GRID_SIZE, cols: GRID_SIZE },
} as GameState['settings'];

export const armyFixture: Army = { id: 0, position: { x: 1, y: 1 }, hasActed: false };

export const localPlayerFixture: Player = buildPlayer({
  id: 0,
  playerId: 'p0',
  name: 'Ada',
  color: PlayerColor.Blue,
  revealedTiles: ['0-0'],
  armies: [armyFixture],
});

export const opponentPlayerFixture: Player = buildPlayer({
  id: 1,
  playerId: 'p1',
  name: 'Bo',
  color: PlayerColor.Red,
  revealedTiles: ['1-1'],
  armies: [{ id: 1, position: { x: 2, y: 2 }, hasActed: false }],
});

export const baseIslandOwnedByLocalPlayer: Island = {
  id: '0-0', x: 0, y: 0, type: IslandType.Base, owner: localPlayerFixture.id, resources: [], occupants: [], positionedBy: [],
};

export const baseIslandOwnedByOpponent: Island = {
  id: '1-1', x: 1, y: 1, type: IslandType.Base, owner: opponentPlayerFixture.id, resources: [], occupants: [], positionedBy: [],
};

export const resourceIsland: Island = {
  id: '2-2', x: 2, y: 2, type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }], occupants: [], positionedBy: [],
};

export const monsterIslandWithLivingMonster: Island = {
  id: '3-3', x: 3, y: 3, type: IslandType.Monster,
  monsters: [{ name: 'Lancer', level: 1, sprite: { idle: '/sprites/lancer_idle.gif', attack: '/sprites/lancer_attack.gif', death: '/sprites/death.gif' } }],
  resources: [], occupants: [],
};

export const specialIsland: Island = {
  id: '4-4', x: 4, y: 4, type: IslandType.Special, resources: [], occupants: [],
};

export const emptyIsland: Island = {
  id: '2-3', x: 2, y: 3, type: IslandType.Empty, resources: [], occupants: [],
};

export const hiddenFogIsland: Island = {
  id: '4-0', x: 4, y: 0, type: IslandType.Empty, resources: [], occupants: [],
};

export const occupiedResourceIsland: Island = {
  id: '2-2-occupied', x: 2, y: 2, type: IslandType.Resource, resources: [{ type: ResourceType.Food, amount: 1 }], occupants: [{ playerId: 0, armyId: 0 }], positionedBy: [],
};

export const gameStateFixture: GameState = buildGameState({
  players: [localPlayerFixture, opponentPlayerFixture],
  map: [
    baseIslandOwnedByLocalPlayer, baseIslandOwnedByOpponent, resourceIsland,
    monsterIslandWithLivingMonster, specialIsland, emptyIsland, hiddenFogIsland, occupiedResourceIsland,
  ],
  settings: BASE_SETTINGS,
});

export const uiStateFixture: GameBoardUIState = initialUIState;

export const possibleMoveUIState: GameBoardUIState = {
  ...initialUIState,
  possibleMoves: [{ x: 2, y: 3 }],
};

export const baseIslandTileContext: IslandTileContext = {
  gameState: gameStateFixture,
  localPlayer: localPlayerFixture,
  uiState: uiStateFixture,
  selectedArmy: null,
};
