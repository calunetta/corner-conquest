'use client';

import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';
import { toSabotageDialogViewModel } from './SabotageDialog.map';
import { styles } from './SabotageDialog.styles';
import type { SabotageDialogProps } from './SabotageDialog.types';

export function SabotageDialog({ players, onSabotage, onClose }: SabotageDialogProps) {
  const viewModel = toSabotageDialogViewModel(players);

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Ban className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Sabotage Opponent</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Target an opponent commander. Their entire army will be forced to skip their next turn.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.grid}>
          {viewModel.targets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => onSabotage(target.id)}
              className={styles.targetButton}
            >
              <div className={styles.spriteWrap}>
                <Image
                  src={target.sprite}
                  alt={target.name}
                  width={36}
                  height={36}
                  className={styles.sprite}
                  unoptimized
                />
              </div>
              <p className={styles.name}>{target.name}</p>
              <span className={styles.skipLabel}>
                <Ban className={styles.skipIcon} /> Skip Turn
              </span>
            </button>
          ))}
        </div>

        <AlertDialogFooter className={styles.footer}>
          <Button variant="outline" size="sm" onClick={onClose} className={styles.closeButton}>
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
