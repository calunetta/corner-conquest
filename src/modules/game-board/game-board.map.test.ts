import type { Player } from '@/lib/types';
import { hasActiveDialogOrPendingAction } from './game-board.map';
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
        specialIslandRoll: { isOpen: true, roll: null, cardDrawn: null },
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
        specialIslandRoll: { isOpen: false, roll: null, cardDrawn: null },
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
