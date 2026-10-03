import type { GameState, Player } from '@/lib/types';
import { AbilityName, PlayerColor } from '@/lib/types';

const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
  ({
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [],
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

const buildGameState = (overrides: Partial<GameState> = {}): GameState => {
  const GRID_SIZE = 5;

  return {
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
      vpPerIslandDiscovery: 1,
      initialDeployCost: 2,
      deployCostIncrement: 1,
      upgradeCost: 2,
      abilityCost: 10,
      baseResourceAmount: 1,
      resourceDensity: 0.5,
      availableCards: [],
      availableAbilities: [AbilityName.Explorer, AbilityName.Collector],
      fogOfWar: true,
      gridSize: { rows: GRID_SIZE, cols: GRID_SIZE },
    },
    deathAnimations: [],
    winner: null,
    combatState: null,
    monsterCombatState: null,
    productiveDialogState: null,
    ...overrides,
  } as unknown as GameState;
};

/** A player who can afford either ability and owns neither yet. */
export const gameStateWithAffordableAbilities = buildGameState();
export const playerWhoCanAffordAbilities = buildPlayer({
  id: 0,
  playerId: 'p0',
  name: 'Ada',
  resources: { food: 0, wood: 0, gold: 20 },
});

/** A player who already owns the Explorer ability and can't afford Collector. */
export const playerWithExplorerAndNoGold = buildPlayer({
  id: 1,
  playerId: 'p1',
  name: 'Bo',
  resources: { food: 0, wood: 0, gold: 0 },
  passiveAbilities: { [AbilityName.Explorer]: true },
});

/** A player who owns Explorer and can afford Collector. */
export const playerWithExplorerAndCanAffordCollector = buildPlayer({
  id: 2,
  playerId: 'p2',
  name: 'Cy',
  resources: { food: 0, wood: 0, gold: 15 },
  passiveAbilities: { [AbilityName.Explorer]: true },
});

/** A game state where it's not the current player's turn. */
export const gameStateNotMyTurn = buildGameState({ currentPlayerIndex: 1 });
