import type { Player } from '@/lib/types';
import { PlayerColor } from '@/lib/types';

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

/** Several opponents, each a different color, to exercise the sprite fallback. */
export const sabotageTargets: Player[] = [
  buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', color: PlayerColor.Blue }),
  buildPlayer({ id: 1, playerId: 'p1', name: 'Bo', color: PlayerColor.Red }),
  buildPlayer({ id: 2, playerId: 'p2', name: 'Cy', color: PlayerColor.Purple }),
];

/** Full grid of 4 opponents with the yellow color. */
export const sabotageFullGrid: Player[] = [
  ...sabotageTargets,
  buildPlayer({ id: 3, playerId: 'p3', name: 'Dan', color: PlayerColor.Yellow }),
];

/** Opponents with long names to test truncation. */
export const sabotageWithLongNames: Player[] = [
  buildPlayer({
    id: 0,
    playerId: 'p0',
    name: 'CommanderWithAVeryLongNameThatShouldTruncate',
    color: PlayerColor.Blue,
  }),
  buildPlayer({ id: 1, playerId: 'p1', name: 'Short', color: PlayerColor.Red }),
  buildPlayer({
    id: 2,
    playerId: 'p2',
    name: 'AnotherPlayerWithAnExtremelyLongNameForTruncationTesting',
    color: PlayerColor.Purple,
  }),
];
