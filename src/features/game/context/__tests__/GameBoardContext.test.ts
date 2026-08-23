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

  it('handles SET_SELECTED_ARMY', () => {
    const nextState = gameBoardReducer(initialTestState, {
      type: 'SET_SELECTED_ARMY',
      armyId: 2,
      possibleMoves: [{ x: 1, y: 1 }],
    });

    expect(nextState.selectedArmyId).toBe(2);
    expect(nextState.possibleMoves).toEqual([{ x: 1, y: 1 }]);
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
