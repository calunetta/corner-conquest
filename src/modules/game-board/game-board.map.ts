import type { GameState } from '@/lib/types';
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

/** True while a dialog, pending step or combat is open; a card-play animation waits for it to clear. */
export function isCardPlayBlocked(
  uiState: GameBoardUIState,
  gameState: Pick<GameState, 'combatState' | 'monsterCombatState' | 'productiveDialogState'>,
): boolean {
  if (hasActiveDialogOrPendingAction(uiState)) return true;
  if (uiState.dialogs.confirmExit || uiState.dialogs.hostLeave) return true;
  return !!gameState.combatState || !!gameState.monsterCombatState || !!gameState.productiveDialogState;
}
