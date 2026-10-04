import type { Army, ArmySelectionDialogState, Player } from '@/lib/types';
import { PlayerColor } from '@/lib/types';
import { toArmySelectionViewModel } from './ArmySelectionDialog.map';

const buildArmy = (overrides: Partial<Army> & { id: number }): Army => ({
  position: { x: 0, y: 0 },
  hasActed: false,
  ...overrides,
});

const buildPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: 0,
    playerId: 'p0',
    name: 'Alice',
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

describe('toArmySelectionViewModel', () => {
  it('returns null when state is null', () => {
    expect(toArmySelectionViewModel(null, buildPlayer(), true, null)).toBeNull();
  });

  it('carries the tile coordinates through from state', () => {
    const state: ArmySelectionDialogState = { x: 5, y: 7, armies: [] };
    const result = toArmySelectionViewModel(state, buildPlayer(), true, null);
    expect(result).toEqual({ x: 5, y: 7, armies: [] });
  });

  it('returns an empty armies array for an empty input', () => {
    const state: ArmySelectionDialogState = { x: 0, y: 0, armies: [] };
    const result = toArmySelectionViewModel(state, buildPlayer(), true, null);
    expect(result?.armies).toEqual([]);
  });

  it.each([
    ['acted', buildArmy({ id: 0, hasActed: true }), []],
    ['positioned', buildArmy({ id: 0, hasActed: false }), [{ x: 0, y: 0, resource: 'food', armyId: 0 }]],
    ['ready', buildArmy({ id: 0, hasActed: false }), []],
  ])('derives status "%s"', (expectedStatus, army, positions) => {
    const state: ArmySelectionDialogState = { x: 0, y: 0, armies: [army] };
    const player = buildPlayer({ positions: positions as Player['positions'] });
    const result = toArmySelectionViewModel(state, player, true, null);
    expect(result?.armies[0].status).toBe(expectedStatus);
  });

  it('prefers "acted" over "positioned" when an army has acted but is also positioned', () => {
    const army = buildArmy({ id: 2, hasActed: true });
    const state: ArmySelectionDialogState = { x: 0, y: 0, armies: [army] };
    const player = buildPlayer({ positions: [{ x: 0, y: 0, resource: 'wood', armyId: 2 }] });
    const result = toArmySelectionViewModel(state, player, true, null);
    expect(result?.armies[0].status).toBe('acted');
  });

  it.each([
    ['not acted, hasExtraMove false, isMyTurn true', false, false, true, true],
    ['not acted, hasExtraMove false, isMyTurn false', false, false, false, false],
    ['acted, hasExtraMove false, isMyTurn true', true, false, true, false],
    ['acted, hasExtraMove true, isMyTurn true', true, true, true, true],
    ['acted, hasExtraMove true, isMyTurn false', true, true, false, false],
  ])('isSelectable: %s -> %s', (_label, hasActed, hasExtraMove, isMyTurn, expected) => {
    const army = buildArmy({ id: 0, hasActed });
    const state: ArmySelectionDialogState = { x: 0, y: 0, armies: [army] };
    const player = buildPlayer({ hasExtraMove });
    const result = toArmySelectionViewModel(state, player, isMyTurn, null);
    expect(result?.armies[0].isSelectable).toBe(expected);
  });

  it('marks the army matching selectedArmyId as selected, others not', () => {
    const state: ArmySelectionDialogState = {
      x: 0,
      y: 0,
      armies: [buildArmy({ id: 0 }), buildArmy({ id: 1 })],
    };
    const result = toArmySelectionViewModel(state, buildPlayer(), true, 1);
    expect(result?.armies[0].isSelected).toBe(false);
    expect(result?.armies[1].isSelected).toBe(true);
  });

  it.each([
    [null, false],
    [undefined, false],
  ])('treats selectedArmyId %s as nothing selected', (selectedArmyId, expected) => {
    const state: ArmySelectionDialogState = { x: 0, y: 0, armies: [buildArmy({ id: 0 })] };
    const result = toArmySelectionViewModel(state, buildPlayer(), true, selectedArmyId);
    expect(result?.armies[0].isSelected).toBe(expected);
  });

  it.each([
    [PlayerColor.Blue, '/sprites/blue.gif'],
    [PlayerColor.Red, '/sprites/red.gif'],
  ])('derives the sprite from the player color (%s)', (color, expectedSprite) => {
    const state: ArmySelectionDialogState = { x: 0, y: 0, armies: [buildArmy({ id: 0 })] };
    const player = buildPlayer({ color });
    const result = toArmySelectionViewModel(state, player, true, null);
    expect(result?.armies[0].sprite).toBe(expectedSprite);
  });

  it('does not mutate the input state or player', () => {
    const state: ArmySelectionDialogState = {
      x: 0,
      y: 0,
      armies: [buildArmy({ id: 0 })],
    };
    const player = buildPlayer();
    const stateCopy = JSON.parse(JSON.stringify(state));
    const playerCopy = JSON.parse(JSON.stringify(player));

    toArmySelectionViewModel(state, player, true, null);

    expect(state).toEqual(stateCopy);
    expect(player).toEqual(playerCopy);
  });
});
