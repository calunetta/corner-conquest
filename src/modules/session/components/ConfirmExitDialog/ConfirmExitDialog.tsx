'use client';

import { AlertTriangle, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { styles } from './ConfirmExitDialog.styles';
import type { ConfirmExitDialogProps } from './ConfirmExitDialog.types';

export function ConfirmExitDialog({ onConfirm, onClose }: ConfirmExitDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <AlertTriangle className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Leave Conquest?</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Leaving will remove your army from this active match. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className={styles.footer}>
          <Button variant="outline" size="sm" onClick={onClose} className={styles.stayButton}>
            Stay in Game
          </Button>
          <Button size="sm" variant="destructive" onClick={onConfirm} className={styles.leaveButton}>
            <LogOut className={styles.leaveIcon} />
            Leave Match
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
