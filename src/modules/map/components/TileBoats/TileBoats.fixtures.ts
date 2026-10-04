import type { Island, Player, GameState } from '@/lib/types';
import { IslandType, PlayerColor } from '@/lib/types';
import type { BoatEntryViewModel } from './TileBoats.types';
import type { GameBoardContextType } from '@/modules/game-board';
import { initialUIState } from '@/modules/game-board';
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

export const baseIsland: Island = {
  id: 'base-1',
  x: 0,
  y: 0,
  type: IslandType.Base,
  owner: 0,
  resources: [],
  occupants: [],
  positionedBy: [],
};

/** A base tile contested by its owner's own army plus an attacker — the scenario that
 * exposed the corner-collision bug in getCornerPosition (fixed in TileBoats.map.ts). */
export const contestedBaseIsland: Island = {
  id: 'base-contested-owner-attacker',
  x: 0,
  y: 0,
  type: IslandType.Base,
  owner: 0,
  resources: [],
  occupants: [
    { playerId: 0, armyId: 0 },
    { playerId: 1, armyId: 1 },
  ],
  positionedBy: [],
};

export const baseIslandWithOccupants: Island = {
  id: 'base-contested-1',
  x: 0,
  y: 0,
  type: IslandType.Base,
  owner: 0,
  resources: [],
  occupants: [
    { playerId: 1, armyId: 10 },
    { playerId: 2, armyId: 20 },
  ],
  positionedBy: [],
};

export const emptyIsland: Island = {
  id: 'empty-1',
  x: 2,
  y: 2,
  type: IslandType.Empty,
  resources: [],
  occupants: [],
  positionedBy: [],
};

export const islandWithOccupants: Island = {
  id: 'occupied-1',
  x: 3,
  y: 3,
  type: IslandType.Empty,
  resources: [],
  occupants: [{ playerId: 0, armyId: 5 }],
  positionedBy: [],
};

export const boatEntryFixture: BoatEntryViewModel = {
  key: 'boat-base-0',
  color: PlayerColor.Blue,
  cornerStyle: { bottom: '2px', right: '2px' },
  showIdleCollector: true,
  idleCollectorSprite: '/sprites/collector_blue_idle.gif',
};

export const gameStateFixture: GameState = buildGameState({
  players: [bluePlayer, redPlayer],
  map: [baseIsland, baseIslandWithOccupants, islandWithOccupants],
  settings: {
    victoryPointGoal: 30,
    fogOfWar: false,
    upgradeCost: 5,
    abilityCost: 3,
    baseResourceAmount: 1,
    availableAbilities: [],
  } as unknown as GameState['settings'],
});

const noop = (): void => undefined;
const asyncNoop = (): Promise<void> => Promise.resolve();

/** A GameBoardContextType for tests; callbacks are plain no-ops, not jest.fn() spies — a test
 * that needs to assert a call happened should create its own local jest.fn() instead. */
export const gameBoardContextFixture: GameBoardContextType = {
  gameState: gameStateFixture,
  localPlayer: bluePlayer,
  uiState: initialUIState,
  dispatch: noop,
  isMyTurn: true,
  isHost: true,
  selectedArmy: null,
  turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
  onAction: asyncNoop,
  onLocalAction: noop,
  handleTileClick: asyncNoop,
  handleStartGame: asyncNoop,
  handleExitClick: asyncNoop,
  handleConfirmExit: asyncNoop,
  handleConfirmHostLeave: asyncNoop,
};
