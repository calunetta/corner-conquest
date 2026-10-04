import type { GameStatus } from '@/lib/types';

export interface HostLeaveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLastPlayer: boolean;
  gameStatus: GameStatus;
}
