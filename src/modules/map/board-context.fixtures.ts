import type { GameState, Player } from '@/lib/types';
import { PlayerColor } from '@/lib/types';

/**
 * Shared scaffold for board-context test/preview fixtures across src/modules/map's component
 * folders (IslandTile, TileBoats, TileOccupants, ...). Not part of the module's public API
 * (@/modules/map's index.ts only exports MapGrid) — import it by its relative path from a
 * sibling component folder's own *.fixtures.ts, which then supplies its own field overrides
 * (in particular `settings`, which differs per component's test needs).
 */
export const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
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

export const buildGameState = (overrides: Partial<GameState> = {}): GameState =>
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
    deathAnimations: [],
    winner: null,
    combatState: null,
    monsterCombatState: null,
    productiveDialogState: null,
    ...overrides,
  }) as unknown as GameState;
