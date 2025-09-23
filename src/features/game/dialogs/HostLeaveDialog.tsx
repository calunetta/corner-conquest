
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
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type HostLeaveDialogProps = {
  isLastPlayer: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  gameStatus: GameStatus;
};

export function HostLeaveDialog({ isLastPlayer, onConfirm, onClose, gameStatus }: HostLeaveDialogProps) {
  const description = () => {
    if (gameStatus === GameStatus.Playing) {
      return "You are the host. If you leave a game in progress, the game room will be deleted, and the match will end for all players.";
    }
    if (isLastPlayer) {
      return 'You are the only player in the room. If you leave, the room will be deleted.';
    }
    return 'As the host, if you leave, the room will remain open for other players.';
  }

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
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
