import type { Army, AttackSelectionDialogState, Player } from '@/lib/types';
import { PlayerColor } from '@/lib/types';

const buildArmy = (overrides: Partial<Army> & { id: number }): Army => ({
  position: { x: 0, y: 0 },
  hasActed: false,
  ...overrides,
});

const buildDefendingPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: 1,
    playerId: 'p1',
    name: 'Bob',
    color: PlayerColor.Red,
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

/** All 3 enemy squads ready to be targeted. */
export const allReadyState: AttackSelectionDialogState = {
  armies: [buildArmy({ id: 0 }), buildArmy({ id: 1 }), buildArmy({ id: 2 })],
  defendingPlayer: buildDefendingPlayer(),
  attackingArmyId: 0,
};

/** One acted, one positioned, one ready. */
export const mixedStatusState: AttackSelectionDialogState = {
  armies: [buildArmy({ id: 0, hasActed: true }), buildArmy({ id: 1 }), buildArmy({ id: 2 })],
  defendingPlayer: buildDefendingPlayer({
    positions: [{ x: 1, y: 1, resource: 'wood', armyId: 1 }],
  }),
  attackingArmyId: 0,
};

/** Not my turn: every button disabled, no `hasExtraMove` exception. */
export const notMyTurnState = allReadyState;
