import { gameBoardReducer, GameBoardUIState } from '../GameBoardContext';
import { CardName } from '@/lib/types';

describe('GameBoard Reducer', () => {
  const initialTestState: GameBoardUIState = {
    selectedArmyId: null,
    possibleMoves: [],
    pendingAction: null,
    isPerformingAction: false,
    isExiting: false,
    dialogs: {
      cardsPlayerId: null,
      abilitiesShopOpen: false,
      armySelection: null,
      attackSelection: null,
      monsterSelection: null,
      position: null,
      sabotage: null,
      wealthy: null,
      stealResource: null,
      specialIslandRoll: null,
      confirmExit: false,
      hostLeave: false,
    },
  };

  it('handles SET_SELECTED_ARMY by setting only selectedArmyId', () => {
    const nextState = gameBoardReducer(initialTestState, {
      type: 'SET_SELECTED_ARMY',
      armyId: 2,
    });

    expect(nextState.selectedArmyId).toBe(2);
    // possibleMoves is derived in useGameBoardState, not reducer state, so the reducer leaves it alone.
    expect(nextState.possibleMoves).toBe(initialTestState.possibleMoves);
  });

  it('handles SET_SELECTED_ARMY with null by clearing the selection', () => {
    const selected: GameBoardUIState = { ...initialTestState, selectedArmyId: 2 };

    const nextState = gameBoardReducer(selected, { type: 'SET_SELECTED_ARMY', armyId: null });

    expect(nextState.selectedArmyId).toBeNull();
  });

  it('handles SET_PENDING_ACTION', () => {
    const nextState = gameBoardReducer(initialTestState, {
      type: 'SET_PENDING_ACTION',
      pendingAction: { type: 'scout', cardName: CardName.Scout, count: 3, scoutedTiles: [] },
    });

    expect(nextState.pendingAction?.type).toBe('scout');
  });

  it('handles dialog toggle and setters', () => {
    let state = gameBoardReducer(initialTestState, {
      type: 'SET_ABILITIES_SHOP_OPEN',
      open: true,
    });
    expect(state.dialogs.abilitiesShopOpen).toBe(true);

    state = gameBoardReducer(state, {
      type: 'TOGGLE_CARDS_DIALOG',
      playerId: 1,
    });
    expect(state.dialogs.cardsPlayerId).toBe(1);

    state = gameBoardReducer(state, {
      type: 'TOGGLE_CARDS_DIALOG',
      playerId: 1,
    });
    expect(state.dialogs.cardsPlayerId).toBeNull();
  });

  it('handles RESET_TURN_UI', () => {
    const modifiedState: GameBoardUIState = {
      ...initialTestState,
      selectedArmyId: 3,
      dialogs: {
        ...initialTestState.dialogs,
        abilitiesShopOpen: true,
        confirmExit: true,
      },
    };

    const resetState = gameBoardReducer(modifiedState, { type: 'RESET_TURN_UI' });
    expect(resetState.selectedArmyId).toBeNull();
    expect(resetState.dialogs.abilitiesShopOpen).toBe(false);
    expect(resetState.dialogs.confirmExit).toBe(false);
  });
});
