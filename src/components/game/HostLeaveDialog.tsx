
'use client';
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
  isLastPlayer: boolean;
  onConfirm: () => void;
  onClose: () => void;
  gameStatus: 'waiting' | 'playing' | 'finished';
};

export function HostLeaveDialog({ isLastPlayer, onConfirm, onClose, gameStatus }: HostLeaveDialogProps) {
  const description = () => {
    if (gameStatus === 'playing') {
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
