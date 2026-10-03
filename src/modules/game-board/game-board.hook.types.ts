import type { Dispatch, SetStateAction } from 'react';
import type { Army, CardName, GameState, Player } from '@/lib/types';
import type { useToast } from '@/hooks/use-toast';
import type { GameBoardContextType, GameBoardProviderProps, GameBoardUIAction, GameBoardUIState } from './game-board.types';

export type ToastFn = ReturnType<typeof useToast>['toast'];
export type OnAction = GameBoardContextType['onAction'];
export type SetLocalGameState = Dispatch<SetStateAction<GameState | null>>;
export type UIDispatch = Dispatch<GameBoardUIAction>;

/** Payloads read by handleLocalAction; shapes taken from the existing destructuring. */
export interface AttackPayload {
  army?: Army;
}
export interface PositionPayload {
  army: Army;
}
export interface UseCardPayload {
  cardName: CardName;
}
export interface CancelPayload {
  cardName?: CardName;
  scoutedTiles?: string[];
}
export interface ShowCardsPayload {
  playerId: number;
}

// ---- game-board.state.hook.ts ----
export interface GameBoardStateArgs {
  serverGameState: GameState;
  localPlayerFromServer: Player;
  playerId: string | null;
  isMyTurn: boolean;
}
export interface GameBoardState {
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  localGameState: GameState | null;
  setLocalGameState: SetLocalGameState;
  gameStateForDisplay: GameState;
  localPlayer: Player;
  selectedArmy: Army | null;
}

// ---- game-board.actions.hook.ts ----
export interface GameBoardActionsArgs {
  isPerformingAction: boolean; // uiState.isPerformingAction
  isMyTurn: boolean;
  localGameState: GameState | null;
  serverGameState: GameState;
  setLocalGameState: SetLocalGameState;
  setGameState: GameBoardProviderProps['setGameState'];
}
export type GameBoardActions = OnAction;

// ---- game-board.card-actions.hook.ts ----
export interface CardActionsArgs {
  localGameState: GameState | null;
  setLocalGameState: SetLocalGameState;
  localPlayer: Player;
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  onAction: OnAction;
  toast: ToastFn;
}
export interface CardActions {
  handleCancelAction: (payload?: CancelPayload) => void;
  handleUseCard: (payload: UseCardPayload) => void;
}

// ---- game-board.local-actions.hook.ts ----
export interface LocalActionsArgs {
  localGameState: GameState | null;
  gameStateForDisplay: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  onAction: OnAction;
  toast: ToastFn;
  handleCancelAction: CardActions['handleCancelAction']; // separate args, see Identity rule
  handleUseCard: CardActions['handleUseCard'];
}
// Also registers the window 'keydown' Escape effect, deps [uiState.selectedArmyId, uiState.pendingAction, handleLocalAction, localPlayer].

// ---- game-board.tile-click.hook.ts ----
export interface TileClickArgs {
  gameStateForDisplay: GameState;
  isMyTurn: boolean;
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  localPlayer: Player;
  selectedArmy: Army | null;
  onAction: OnAction;
  toast: ToastFn;
}

// ---- game-board.session.hook.ts ----
export interface SessionHandlersArgs {
  gameId: string;
  serverGameState: GameState;
  localPlayerFromServer: Player;
  localPlayerName: string | undefined; // localPlayer?.name, was the dep `localPlayer?.name`
  isHost: boolean;
  dispatch: UIDispatch;
  setGameState: GameBoardProviderProps['setGameState'];
  onExit: () => void;
  toast: ToastFn;
}
export type SessionHandlers = Pick<
  GameBoardContextType,
  'handleStartGame' | 'handleExitClick' | 'handleConfirmExit' | 'handleConfirmHostLeave'
>;

// ---- game-board.hook.ts ----
// Call order (must match today's hook order): useToast, useGameBoardState, useGameBoardActions,
// useCardActions, useLocalActions (incl. Escape effect), auto end-turn useEffect, useTileClick,
// useSessionHandlers, useTurnTimer, useMemo(contextValue).
// contextValue deps = the 14 entries of GameBoardContext.tsx:507-520 PLUS `dispatch` (15; stable, required by exhaustive-deps).
// `handleStartGame` gets `localPlayerName: localPlayer.name` (the DERIVED localPlayer, not localPlayerFromServer, as at :439).
