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
import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConfirmExitDialogProps = {
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmExitDialog({ onConfirm, onClose }: ConfirmExitDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden">
        <AlertDialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center justify-center text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Leave Conquest?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Leaving will remove your army from this active match. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-2 border-t border-white/10 gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-xs">
            Stay in Game
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onConfirm}
            className="text-xs font-bold"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Leave Match
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
