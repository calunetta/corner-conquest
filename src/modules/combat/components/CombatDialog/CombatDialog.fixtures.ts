import type { GameState, Player } from '@/lib/types';
import { CardName, IslandType, PlayerColor } from '@/lib/types';

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

const baseCombat = {
  attackerId: 0,
  attackingArmyId: 1,
  defenderId: 1,
  defendingArmyId: 2,
};

/** Rolling phase, attacker can act, no tactical cards. */
export const rollingPhaseAttackerNoCards = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? p : { ...p, specialCards: [] })),
  combatState: { ...baseCombat, attackerRolls: [], defenderRolls: [], winnerId: null, phase: 'rolling' },
});

/** Rolling phase, attacker can act, both tactical cards available. */
export const rollingPhaseAttackerBothCards = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [CardName.Overcome, CardName.WarChief] } : { ...p, specialCards: [] })),
  combatState: { ...baseCombat, attackerRolls: [], defenderRolls: [], winnerId: null, phase: 'rolling' },
});

/** Rolling phase, spectator/defender waiting. */
export const rollingPhaseSpectator = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [CardName.Overcome] } : { ...p, specialCards: [] })),
  combatState: { ...baseCombat, attackerRolls: [], defenderRolls: [], winnerId: null, phase: 'rolling' },
});

/** Results phase, attacker wins. */
export const resultsPhaseAttackerWins = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [CardName.Overcome] } : { ...p, specialCards: [] })),
  combatState: { ...baseCombat, attackerRolls: [5, 4, 3], defenderRolls: [2, 2, 1], winnerId: 0, phase: 'results' },
});

/** Results phase, draw. */
export const resultsPhaseDrawn = buildGameState({
  players: basePlayers.map(p => (p.id === 0 ? { ...p, specialCards: [CardName.WarChief] } : { ...p, specialCards: [] })),
  combatState: { ...baseCombat, attackerRolls: [3, 3, 3], defenderRolls: [3, 3, 3], winnerId: null, phase: 'results' },
});
