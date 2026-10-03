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

/** Two opponents with different resource totals, one with an exhausted resource. */
export const stealTargets: Player[] = [
  buildPlayer({
    id: 0,
    playerId: 'p0',
    name: 'Ada',
    color: PlayerColor.Red,
    resources: { food: 3, wood: 2, gold: 5 },
  }),
  buildPlayer({
    id: 1,
    playerId: 'p1',
    name: 'Bo',
    color: PlayerColor.Purple,
    resources: { food: 0, wood: 4, gold: 0 },
  }),
];
