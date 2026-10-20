import type { GameState, Player } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import { hasActiveDialogOrPendingAction, isCardPlayBlocked } from './game-board.map';
import { initialUIState } from './game-board.types';
import type { GameBoardUIState } from './game-board.types';

describe('hasActiveDialogOrPendingAction', () => {
  it('returns false for initialUIState', () => {
    expect(hasActiveDialogOrPendingAction(initialUIState)).toBe(false);
  });

  it('returns true when pendingAction is set', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      pendingAction: { type: 'teleport', cardName: 'Teleport' },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when armySelection dialog is set', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        armySelection: { armies: [], x: 0, y: 0 },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when attackSelection dialog is set', () => {
    const mockPlayer: Player = {
      id: 1,
      playerId: '1',
      color: 'blue',
      name: 'Player 1',
      armies: [],
      specialCards: [],
      revealedTiles: [],
      resources: { wood: 0, wheat: 0, stone: 0, iron: 0 },
      victoryPoints: 0,
      actionsThisTurn: [],
      reinforceActive: false,
      efficientActive: false,
      masterBuilderActive: false,
      hasExtraMove: false,
      cardCooldowns: {},
    } as unknown as Player;

    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        attackSelection: { attackingArmyId: 1, defendingPlayer: mockPlayer, armies: [] },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when monsterSelection dialog is set', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        monsterSelection: { attackingArmyId: 1, monsters: [] },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when position dialog is set', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        position: { x: 0, y: 0, resources: [], armyId: 1 },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when specialIslandRoll.isOpen is true', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        specialIslandRoll: { isOpen: true, roll: null, cardDrawn: null, x: 2, y: 3 },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when stealResource.isOpen is true', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        stealResource: { isOpen: true },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when sabotage.isOpen is true', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        sabotage: { isOpen: true },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when wealthy.isOpen is true', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        wealthy: { isOpen: true },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when abilitiesShopOpen is true', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        abilitiesShopOpen: true,
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns true when cardsPlayerId is set (non-null)', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        cardsPlayerId: 0,
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(true);
  });

  it('returns false when specialIslandRoll.isOpen is false', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        specialIslandRoll: { isOpen: false, roll: null, cardDrawn: null, x: 2, y: 3 },
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(false);
  });

  it('returns false regardless of confirmExit dialog state', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        confirmExit: true,
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(false);
  });

  it('returns false regardless of hostLeave dialog state', () => {
    const state: GameBoardUIState = {
      ...initialUIState,
      dialogs: {
        ...initialUIState.dialogs,
        hostLeave: true,
      },
    };
    expect(hasActiveDialogOrPendingAction(state)).toBe(false);
  });
});

describe('isCardPlayBlocked', () => {
  type Slice = Parameters<typeof isCardPlayBlocked>[1];
  const idle: Slice = { combatState: null, monsterCombatState: null, productiveDialogState: null };
  const someCombat = {} as unknown as GameState['combatState'];
  const someMonsterCombat = {} as unknown as GameState['monsterCombatState'];

  it('is false for initialUIState with no combat or productive dialog', () => {
    expect(isCardPlayBlocked(initialUIState, idle)).toBe(false);
  });

  it.each<[string, GameBoardUIState, Slice]>([
    [
      'a pending extra-move',
      { ...initialUIState, pendingAction: { type: 'extra-move', cardName: 'Extra Move' } },
      idle,
    ],
    [
      'a runtime-only sabotage pending action',
      {
        ...initialUIState,
        pendingAction: { type: 'sabotage', cardName: 'Sabotage' } as unknown as PendingAction,
      },
      idle,
    ],
    [
      'a pending teleport with armySelection open',
      {
        ...initialUIState,
        pendingAction: { type: 'teleport', cardName: 'Teleport' },
        dialogs: { ...initialUIState.dialogs, armySelection: { armies: [], x: 0, y: 0 } },
      },
      idle,
    ],
    [
      'a pending teleport with the cards dialog open',
      {
        ...initialUIState,
        pendingAction: { type: 'teleport', cardName: 'Teleport' },
        dialogs: { ...initialUIState.dialogs, cardsPlayerId: 0 },
      },
      idle,
    ],
    [
      'a pending scout with confirmExit open',
      {
        ...initialUIState,
        pendingAction: { type: 'scout', cardName: 'Scout', count: 3, scoutedTiles: [] },
        dialogs: { ...initialUIState.dialogs, confirmExit: true },
      },
      idle,
    ],
    [
      'a pending teleport during combat',
      { ...initialUIState, pendingAction: { type: 'teleport', cardName: 'Teleport' } },
      { ...idle, combatState: someCombat },
    ],
    ['confirmExit', { ...initialUIState, dialogs: { ...initialUIState.dialogs, confirmExit: true } }, idle],
    ['hostLeave', { ...initialUIState, dialogs: { ...initialUIState.dialogs, hostLeave: true } }, idle],
    ['combatState', initialUIState, { ...idle, combatState: someCombat }],
    ['monsterCombatState', initialUIState, { ...idle, monsterCombatState: someMonsterCombat }],
    [
      'productiveDialogState',
      initialUIState,
      { ...idle, productiveDialogState: { playerId: 0 } as unknown as GameState['productiveDialogState'] },
    ],
  ])('is true for %s', (_name, uiState, gameState) => {
    expect(isCardPlayBlocked(uiState, gameState)).toBe(true);
  });

  it.each<[string, PendingAction]>([
    ['teleport', { type: 'teleport', cardName: 'Teleport' }],
    ['scout', { type: 'scout', cardName: 'Scout', count: 3, scoutedTiles: [] }],
  ])('is false while only a %s pending action (map targeting) is set', (_name, pendingAction) => {
    expect(isCardPlayBlocked({ ...initialUIState, pendingAction }, idle)).toBe(false);
  });

  it('keeps hasActiveDialogOrPendingAction true for a pending teleport (not changed)', () => {
    const uiState: GameBoardUIState = {
      ...initialUIState,
      pendingAction: { type: 'teleport', cardName: 'Teleport' },
    };
    expect(hasActiveDialogOrPendingAction(uiState)).toBe(true);
  });

  it('does not mutate uiState', () => {
    const uiState: GameBoardUIState = {
      ...initialUIState,
      pendingAction: { type: 'teleport', cardName: 'Teleport' },
    };
    isCardPlayBlocked(uiState, idle);
    expect(uiState.pendingAction).toEqual({ type: 'teleport', cardName: 'Teleport' });
  });
});
