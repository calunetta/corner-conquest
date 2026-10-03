import type { GameState, Player, Monster } from '@/lib/types';
import { CardName, IslandType, PlayerColor, MonsterName } from '@/lib/types';

const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
  ({
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [],
    resources: { wheat: 0, iron: 0, gems: 0 },
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
  const GRID_COLS = 5;
  const players = overrides.players ?? [
    buildPlayer({ id: 0, playerId: 'p0', color: 'blue', name: 'Alice' }),
    buildPlayer({ id: 1, playerId: 'p1', color: 'red', name: 'Bob' }),
  ];
  const map = Array.from({ length: GRID_COLS * GRID_COLS }, (_, i) => ({
    id: `${i % GRID_COLS}-${Math.floor(i / GRID_COLS)}`,
    x: i % GRID_COLS,
    y: Math.floor(i / GRID_COLS),
    type: IslandType.Empty,
    resources: [],
    occupants: [],
  }));

  return {
    id: 'game_test',
    name: 'Test Game',
    status: 'playing',
    players,
    map,
    baseTiles: [],
    currentPlayerIndex: 0,
    turn: 1,
    log: [],
    discardPile: [],
    specialCardsDeck: [],
    settings: { gridSize: { rows: GRID_COLS, cols: GRID_COLS }, victoryPointGoal: 30 },
    deathAnimations: [],
    winner: null,
    combatState: null,
    monsterCombatState: null,
    ...overrides,
  } as unknown as GameState;
};

const basePlayers = [
  buildPlayer({ id: 0, playerId: 'p0', color: 'blue', name: 'Alice' }),
  buildPlayer({ id: 1, playerId: 'p1', color: 'red', name: 'Bob' }),
];

const baseMonster: Monster = {
  name: MonsterName.Bear,
  level: 2,
  sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/death.gif' },
};

const baseMonsterCombat = {
  attackerId: 0,
  attackerPosition: { x: 0, y: 0 },
  monster: baseMonster,
};

/** Attack screen — no tactical cards. */
export const attackScreenNoCards = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [] } : p)),
  monsterCombatState: { ...baseMonsterCombat, attackerRolls: [], monsterRolls: [], winnerId: null, phase: 'rolling' },
});

/** Attack screen — all three tactical cards available. */
export const attackScreenAllCards = buildGameState({
  players: basePlayers.map(p =>
    p.id === 0 ? { ...p, specialCards: [CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll] } : p,
  ),
  monsterCombatState: { ...baseMonsterCombat, attackerRolls: [], monsterRolls: [], winnerId: null, phase: 'rolling' },
});

/** Results — player wins. */
export const resultsPlayerWins = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [CardName.Overcome] } : p)),
  monsterCombatState: {
    ...baseMonsterCombat,
    attackerRolls: [5, 4, 3],
    monsterRolls: [2, 2, 1],
    winnerId: 0,
    phase: 'results',
  },
});

/** Results — monster wins. */
export const resultsMonsterWins = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [CardName.WarChief] } : p)),
  monsterCombatState: {
    ...baseMonsterCombat,
    attackerRolls: [2, 2, 1],
    monsterRolls: [5, 4, 3],
    winnerId: null, // Monster wins when not the attacker
    phase: 'results',
  },
});

/** Spectator — waiting. */
export const spectatorWaiting = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [CardName.Overcome] } : p)),
  monsterCombatState: { ...baseMonsterCombat, attackerRolls: [], monsterRolls: [], winnerId: null, phase: 'rolling' },
});
