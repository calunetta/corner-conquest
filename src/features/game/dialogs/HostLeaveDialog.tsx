'use client';

import { GameStatus } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      return "You are the host. If you leave a game in progress, the game room will be closed, and the match will end for all players.";
    }
    if (isLastPlayer) {
      return 'You are the only player remaining. If you leave, the game room will be dismantled.';
    }
    return 'As the host, if you leave now, the next player in line will become the new host.';
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center justify-center text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Host Departure</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                {description()}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-2 border-t border-white/10 gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onConfirm}
            className="text-xs font-bold"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Confirm & Leave
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
