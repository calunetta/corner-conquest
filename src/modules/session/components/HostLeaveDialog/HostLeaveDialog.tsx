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
import { toHostLeaveDescription } from './HostLeaveDialog.map';
import { styles } from './HostLeaveDialog.styles';
import type { HostLeaveDialogProps } from './HostLeaveDialog.types';

export function HostLeaveDialog({ open, onClose, onConfirm, isLastPlayer, gameStatus }: HostLeaveDialogProps) {
  const description = toHostLeaveDescription(gameStatus, isLastPlayer);

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <AlertTriangle className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Host Departure</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className={styles.footer}>
          <Button variant="outline" size="sm" onClick={onClose} className={styles.cancelButton}>
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={onConfirm} className={styles.confirmButton}>
            <LogOut className={styles.confirmIcon} />
            Confirm & Leave
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
