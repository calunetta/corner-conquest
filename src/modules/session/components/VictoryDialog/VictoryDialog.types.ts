import type { Player } from '@/lib/types';

export interface VictoryDialogProps {
  winner: Player;
  isLocalWinner: boolean;
  /** Mirrors GameBoardUIState.isExiting; true while handleConfirmExit's promise is pending. */
  isExiting: boolean;
  onReturnToLobby: () => void;
}
