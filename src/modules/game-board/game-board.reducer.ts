/**
 * Pure reducer for GameBoardUIState, extracted verbatim from the legacy
 * `src/features/game/context/GameBoardContext.tsx` (re-exported there under the same name so its
 * ~10 consumers and `GameBoardContext.test.ts` need no change).
 */
import { initialUIState, type GameBoardUIAction, type GameBoardUIState } from './game-board.types';

export function gameBoardReducer(state: GameBoardUIState, action: GameBoardUIAction): GameBoardUIState {
  switch (action.type) {
    case 'SET_SELECTED_ARMY':
      return {
        ...state,
        selectedArmyId: action.armyId,
        possibleMoves: action.possibleMoves !== undefined ? action.possibleMoves : state.possibleMoves,
      };
    case 'SET_POSSIBLE_MOVES':
      return {
        ...state,
        possibleMoves: action.possibleMoves,
      };
    case 'SET_PENDING_ACTION':
      return {
        ...state,
        pendingAction: action.pendingAction,
      };
    case 'SET_PERFORMING_ACTION':
      return {
        ...state,
        isPerformingAction: action.isPerforming,
      };
    case 'SET_EXITING':
      return {
        ...state,
        isExiting: action.isExiting,
      };
    case 'TOGGLE_CARDS_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          cardsPlayerId: state.dialogs.cardsPlayerId === action.playerId ? null : action.playerId,
        },
      };
    case 'SET_ABILITIES_SHOP_OPEN':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          abilitiesShopOpen: action.open,
        },
      };
    case 'SET_ARMY_SELECTION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          armySelection: action.state,
        },
      };
    case 'SET_ATTACK_SELECTION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          attackSelection: action.state,
        },
      };
    case 'SET_MONSTER_SELECTION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          monsterSelection: action.state,
        },
      };
    case 'SET_POSITION_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          position: action.state,
        },
      };
    case 'SET_SABOTAGE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          sabotage: action.state,
        },
      };
    case 'SET_WEALTHY_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          wealthy: action.state,
        },
      };
    case 'SET_STEAL_RESOURCE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          stealResource: action.state,
        },
      };
    case 'SET_SPECIAL_ISLAND_ROLL_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          specialIslandRoll: action.state,
        },
      };
    case 'SET_CONFIRM_EXIT_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          confirmExit: action.open,
        },
      };
    case 'SET_HOST_LEAVE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          hostLeave: action.open,
        },
      };
    case 'RESET_TURN_UI':
      return {
        ...initialUIState,
      };
    default:
      return state;
  }
}
