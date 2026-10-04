'use client';

import Image from 'next/image';
import { Skull } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toMonsterSelectionViewModel } from './MonsterSelectionDialog.map';
import { styles } from './MonsterSelectionDialog.styles';
import type { MonsterOptionViewModel, MonsterSelectionDialogProps } from './MonsterSelectionDialog.types';

export function MonsterSelectionDialog({ state, onSelectTarget, onClose, isMyTurn }: MonsterSelectionDialogProps) {
  const viewModel = toMonsterSelectionViewModel(state);
  if (!viewModel) return null;

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Skull className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Select Wild Monster</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Multiple beasts roam this island. Select which monster to engage in battle.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.grid}>
          {viewModel.monsters.map((monster: MonsterOptionViewModel, index: number) => (
            <button
              // Index key matches legacy MonsterSelectionDialog.tsx: multiple monsters on one
              // tile can share the same name, so `name` alone is not a stable unique id here.
              key={index}
              type="button"
              disabled={!isMyTurn}
              onClick={() => isMyTurn && onSelectTarget(monster.name)}
              className={cn(
                styles.monsterButton,
                isMyTurn ? styles.monsterButtonEnabled : styles.monsterButtonDisabled,
              )}
            >
              <div className={styles.spriteWrap}>
                <Image
                  src={monster.sprite}
                  alt={monster.name}
                  width={54}
                  height={54}
                  className={styles.sprite}
                  unoptimized
                />
              </div>
              <p className={styles.name}>{monster.label}</p>
              <span className={styles.powerLabel}>{monster.powerLabel}</span>
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
