import type { Army, ArmySelectionDialogState, Player } from '@/lib/types';
import { PlayerColor } from '@/lib/types';

const buildArmy = (overrides: Partial<Army> & { id: number }): Army => ({
  position: { x: 0, y: 0 },
  hasActed: false,
  ...overrides,
});

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

/** All 3 squads ready to act. */
export const allReadyState: ArmySelectionDialogState = {
  x: 2,
  y: 3,
  armies: [buildArmy({ id: 0 }), buildArmy({ id: 1 }), buildArmy({ id: 2 })],
};

export const allReadyPlayer: Player = buildPlayer({ id: 0, playerId: 'p0', name: 'Alice', color: PlayerColor.Blue });

/** One acted, one positioned, one ready. */
export const mixedStatusState: ArmySelectionDialogState = {
  x: 2,
  y: 3,
  armies: [buildArmy({ id: 0, hasActed: true }), buildArmy({ id: 1 }), buildArmy({ id: 2 })],
};

export const mixedStatusPlayer: Player = buildPlayer({
  id: 0,
  playerId: 'p0',
  name: 'Alice',
  color: PlayerColor.Red,
  positions: [{ x: 2, y: 3, resource: 'food', armyId: 1 }],
});

/** Same as mixedStatusState, but squad 2 is the currently selected one. */
export const oneSelectedState = mixedStatusState;
export const oneSelectedPlayer = mixedStatusPlayer;
export const oneSelectedArmyId = 2;

/** Not my turn: nothing is selectable regardless of status. */
export const notMyTurnState = allReadyState;
export const notMyTurnPlayer = allReadyPlayer;
