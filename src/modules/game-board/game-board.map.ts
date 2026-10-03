import type { GameBoardUIState } from './game-board.types';

/** Determine if any interactive dialog or multi-step action is active. */
export function hasActiveDialogOrPendingAction(uiState: GameBoardUIState): boolean {
  if (uiState.pendingAction) return true;
  if (uiState.dialogs.armySelection) return true;
  if (uiState.dialogs.attackSelection) return true;
  if (uiState.dialogs.monsterSelection) return true;
  if (uiState.dialogs.position) return true;
  if (uiState.dialogs.specialIslandRoll?.isOpen) return true;
  if (uiState.dialogs.stealResource?.isOpen) return true;
  if (uiState.dialogs.sabotage?.isOpen) return true;
  if (uiState.dialogs.wealthy?.isOpen) return true;
  if (uiState.dialogs.abilitiesShopOpen) return true;
  if (uiState.dialogs.cardsPlayerId !== null) return true;
  return false;
}
