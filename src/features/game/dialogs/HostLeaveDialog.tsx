
'use client';
import { GameStatus } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type HostLeaveDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLastPlayer: boolean;
  gameStatus: GameStatus;
};

export function HostLeaveDialog({ open, onClose, onConfirm, isLastPlayer, gameStatus }: HostLeaveDialogProps) {
  const description = () => {
    if (gameStatus === GameStatus.Playing) {
      return "You are the host. If you leave a game in progress, the game room will be deleted, and the match will end for all players.";
    }
    if (isLastPlayer) {
      return 'You are the only one left. If you leave, the game room will be deleted.';
    }
    return 'As the host, if you leave, the next player in line will become the new host.';
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
          <AlertDialogDescription>
            {description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm & Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
