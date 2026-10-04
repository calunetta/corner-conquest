import type { Army, AttackSelectionDialogState, Player } from '@/lib/types';
import { PlayerColor } from '@/lib/types';
import { toAttackSelectionViewModel } from './AttackSelectionDialog.map';

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

describe('toAttackSelectionViewModel', () => {
  it('returns null when state is null', () => {
    expect(toAttackSelectionViewModel(null, true)).toBeNull();
  });

  it('returns an empty armies array for an empty input', () => {
    const state: AttackSelectionDialogState = {
      armies: [],
      defendingPlayer: buildDefendingPlayer(),
      attackingArmyId: 0,
    };
    const result = toAttackSelectionViewModel(state, true);
    expect(result?.armies).toEqual([]);
  });

  it('carries the defending player name through', () => {
    const state: AttackSelectionDialogState = {
      armies: [],
      defendingPlayer: buildDefendingPlayer({ name: 'Carol' }),
      attackingArmyId: 0,
    };
    const result = toAttackSelectionViewModel(state, true);
    expect(result?.defendingPlayerName).toBe('Carol');
  });

  it.each([
    ['acted', buildArmy({ id: 0, hasActed: true }), []],
    ['positioned', buildArmy({ id: 0, hasActed: false }), [{ x: 0, y: 0, resource: 'food', armyId: 0 }]],
    ['ready', buildArmy({ id: 0, hasActed: false }), []],
  ])('derives status "%s" from the defending player positions', (expectedStatus, army, positions) => {
    const state: AttackSelectionDialogState = {
      armies: [army],
      defendingPlayer: buildDefendingPlayer({ positions: positions as Player['positions'] }),
      attackingArmyId: 0,
    };
    const result = toAttackSelectionViewModel(state, true);
    expect(result?.armies[0].status).toBe(expectedStatus);
  });

  it('prefers "acted" over "positioned" when an army has acted but is also positioned', () => {
    const army = buildArmy({ id: 3, hasActed: true });
    const state: AttackSelectionDialogState = {
      armies: [army],
      defendingPlayer: buildDefendingPlayer({ positions: [{ x: 0, y: 0, resource: 'gold', armyId: 3 }] }),
      attackingArmyId: 0,
    };
    const result = toAttackSelectionViewModel(state, true);
    expect(result?.armies[0].status).toBe('acted');
  });

  it.each([
    [PlayerColor.Blue, '/sprites/blue.gif'],
    [PlayerColor.Red, '/sprites/red.gif'],
  ])('derives the sprite from the defending player color (%s)', (color, expectedSprite) => {
    const state: AttackSelectionDialogState = {
      armies: [buildArmy({ id: 0 })],
      defendingPlayer: buildDefendingPlayer({ color }),
      attackingArmyId: 0,
    };
    const result = toAttackSelectionViewModel(state, true);
    expect(result?.armies[0].sprite).toBe(expectedSprite);
  });

  it('produces the same view model regardless of isMyTurn (no per-army selectability field)', () => {
    const state: AttackSelectionDialogState = {
      armies: [buildArmy({ id: 0 }), buildArmy({ id: 1, hasActed: true })],
      defendingPlayer: buildDefendingPlayer(),
      attackingArmyId: 0,
    };
    expect(toAttackSelectionViewModel(state, true)).toEqual(toAttackSelectionViewModel(state, false));
  });

  it('does not mutate the input state', () => {
    const state: AttackSelectionDialogState = {
      armies: [buildArmy({ id: 0 })],
      defendingPlayer: buildDefendingPlayer(),
      attackingArmyId: 0,
    };
    const stateCopy = JSON.parse(JSON.stringify(state));

    toAttackSelectionViewModel(state, true);

    expect(state).toEqual(stateCopy);
  });
});
