'use client';

import Image from 'next/image';
import { AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { HandMetal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { styles } from './StealResourceDialog.styles';
import type { PlayerSelectionStepProps } from './StealResourceDialog.types';

export function PlayerSelectionStep({ options, onSelectPlayer, onClose }: PlayerSelectionStepProps) {
  return (
    <>
      <AlertDialogHeader className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.iconWrap}>
            <HandMetal className={styles.icon} />
          </div>
          <div>
            <AlertDialogTitle className={styles.title}>Infiltrate & Steal</AlertDialogTitle>
            <AlertDialogDescription className={styles.description}>
              Select an opponent to pillage 2 resource units from their stockpile.
            </AlertDialogDescription>
          </div>
        </div>
      </AlertDialogHeader>

      <div className={styles.playerGrid}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`steal-target-player-${option.id}`}
            onClick={() => onSelectPlayer(option.id)}
            className={cn(
              styles.playerButtonBase,
              option.isSelected ? styles.playerButtonSelected : styles.playerButtonIdle,
            )}
          >
            <div className={styles.spriteWrap}>
              <Image src={option.sprite} alt={option.name} width={36} height={36} className={styles.sprite} unoptimized />
            </div>
            <p className={styles.playerName}>{option.name}</p>
            <span className={styles.totalResources}>{option.totalResources} total resources</span>
          </button>
        ))}
      </div>

      <AlertDialogFooter className={styles.footer}>
        <Button variant="outline" size="sm" onClick={onClose} className={styles.closeButton}>
          Cancel
        </Button>
      </AlertDialogFooter>
    </>
  );
}
