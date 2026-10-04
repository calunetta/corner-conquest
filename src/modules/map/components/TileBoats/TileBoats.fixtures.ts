import type { Island, Player, GameState } from '@/lib/types';
import { IslandType, PlayerColor } from '@/lib/types';
import type { BoatEntryViewModel } from './TileBoats.types';
import type { GameBoardContextType } from '@/modules/game-board';
import { initialUIState } from '@/modules/game-board';

const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
  ({
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [{ id: overrides.id, position: { x: 1, y: 1 }, hasActed: false }],
    resources: { food: 0, wood: 0, gold: 0 },
    armyCount: 1,
    attackPower: 0,
    nextArmyCost: 6,
    victoryPoints: 0,
    specialCards: [],
    positions: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: {},
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    revealedTiles: [],
    ...overrides,
  }) as Player;

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

const buildGameState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    id: 'game_test',
    name: 'Test Game',
    status: 'playing',
    maxPlayers: 4,
    debugMode: false,
    players: [],
    map: [],
    baseTiles: [],
    currentPlayerIndex: 0,
    turn: 1,
    log: [],
    discardPile: [],
    specialCardsDeck: [],
    settings: {
      victoryPointGoal: 30,
      fogOfWar: false,
      upgradeCost: 5,
      abilityCost: 3,
      baseResourceAmount: 1,
      availableAbilities: [],
    },
    deathAnimations: [],
    winner: null,
    combatState: null,
    monsterCombatState: null,
    productiveDialogState: null,
    ...overrides,
  }) as unknown as GameState;

export const gameStateFixture: GameState = buildGameState({
  players: [bluePlayer, redPlayer],
  map: [baseIsland, baseIslandWithOccupants, islandWithOccupants],
});

export const gameBoardContextFixture: GameBoardContextType = {
  gameState: gameStateFixture,
  localPlayer: bluePlayer,
  uiState: initialUIState,
  dispatch: jest.fn(),
  isMyTurn: true,
  isHost: true,
  selectedArmy: null,
  turnTimer: { timeLeft: 60, formattedTime: '1:00', turnDuration: 60, isExpiring: false, percentage: 100 },
  onAction: jest.fn(),
  onLocalAction: jest.fn(),
  handleTileClick: jest.fn(),
  handleStartGame: jest.fn(),
  handleExitClick: jest.fn(),
  handleConfirmExit: jest.fn(),
  handleConfirmHostLeave: jest.fn(),
} as unknown as GameBoardContextType;
