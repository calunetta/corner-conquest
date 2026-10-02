/**
 * Local (non-Firestore) UI state for the game board: which army is selected, which dialogs are
 * open, and multi-step pending actions like Scout or Teleport. Extracted from the legacy
 * `src/features/game/context/GameBoardContext.tsx`, which re-exports everything here under its
 * original names so none of its ~10 consumers need to change (see component-architecture's
 * "Migrating a legacy component" and docs/ai/tasks/2026-10-02-gameboardcontext-migration/).
 */
import type { Dispatch, ReactNode } from 'react';
import type { Army, GameAction, GameState, Player } from '@/lib/types';
import type {
  ArmySelectionDialogState,
  AttackSelectionDialogState,
  MonsterSelectionDialogState,
  PendingAction,
  PositionDialogState,
  SabotageDialogState,
  SpecialIslandRollDialogState,
  StealResourceDialogState,
  WealthyDialogState,
} from '@/lib/types/dialogs';

export interface GameBoardUIState {
  selectedArmyId: number | null;
  possibleMoves: { x: number; y: number }[];
  pendingAction: PendingAction;
  isPerformingAction: boolean;
  isExiting: boolean;
  dialogs: {
    cardsPlayerId: number | null;
    abilitiesShopOpen: boolean;
    armySelection: ArmySelectionDialogState;
    attackSelection: AttackSelectionDialogState | null;
    monsterSelection: MonsterSelectionDialogState | null;
    position: PositionDialogState;
    sabotage: SabotageDialogState;
    wealthy: WealthyDialogState;
    stealResource: StealResourceDialogState;
    specialIslandRoll: SpecialIslandRollDialogState;
    confirmExit: boolean;
    hostLeave: boolean;
  };
}

export const initialUIState: GameBoardUIState = {
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

export type GameBoardUIAction =
  | { type: 'SET_SELECTED_ARMY'; armyId: number | null; possibleMoves?: { x: number; y: number }[] }
  | { type: 'SET_POSSIBLE_MOVES'; possibleMoves: { x: number; y: number }[] }
  | { type: 'SET_PENDING_ACTION'; pendingAction: PendingAction }
  | { type: 'SET_PERFORMING_ACTION'; isPerforming: boolean }
  | { type: 'SET_EXITING'; isExiting: boolean }
  | { type: 'TOGGLE_CARDS_DIALOG'; playerId: number | null }
  | { type: 'SET_ABILITIES_SHOP_OPEN'; open: boolean }
  | { type: 'SET_ARMY_SELECTION_DIALOG'; state: ArmySelectionDialogState }
  | { type: 'SET_ATTACK_SELECTION_DIALOG'; state: AttackSelectionDialogState | null }
  | { type: 'SET_MONSTER_SELECTION_DIALOG'; state: MonsterSelectionDialogState | null }
  | { type: 'SET_POSITION_DIALOG'; state: PositionDialogState }
  | { type: 'SET_SABOTAGE_DIALOG'; state: SabotageDialogState }
  | { type: 'SET_WEALTHY_DIALOG'; state: WealthyDialogState }
  | { type: 'SET_STEAL_RESOURCE_DIALOG'; state: StealResourceDialogState }
  | { type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG'; state: SpecialIslandRollDialogState }
  | { type: 'SET_CONFIRM_EXIT_DIALOG'; open: boolean }
  | { type: 'SET_HOST_LEAVE_DIALOG'; open: boolean }
  | { type: 'RESET_TURN_UI' };

export interface GameBoardContextType {
  uiState: GameBoardUIState;
  dispatch: Dispatch<GameBoardUIAction>;
  gameState: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  isHost: boolean;
  selectedArmy: Army | null;
  turnTimer: {
    timeLeft: number;
    formattedTime: string;
    turnDuration: number;
    isExpiring: boolean;
    percentage: number;
  };
  // Verbatim from the legacy interface this file extracts — tightening these is a separate,
  // future change (see docs/ai/tasks/2026-10-02-gameboardcontext-migration/progress.md), not part
  // of this zero-behavior-change extraction.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: GameAction, payload?: any) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLocalAction: (action: GameAction, payload?: any) => void;
  handleTileClick: (x: number, y: number) => Promise<void>;
  handleStartGame: () => Promise<void>;
  handleExitClick: () => Promise<void>;
  handleConfirmExit: () => Promise<void>;
  handleConfirmHostLeave: () => Promise<void>;
}

export interface GameBoardProviderProps {
  children: ReactNode;
  gameId: string;
  playerId: string | null;
  serverGameState: GameState;
  localPlayerFromServer: Player;
  isMyTurn: boolean;
  isHost: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- verbatim, see the note above
  setGameState: (state: GameState, action: GameAction, payload?: any) => Promise<void>;
  onExit: () => void;
}
