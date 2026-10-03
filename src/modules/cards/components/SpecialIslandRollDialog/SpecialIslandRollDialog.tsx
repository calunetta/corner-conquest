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
import { Dices, Sparkles, XCircle } from 'lucide-react';
import { toSpecialIslandRollViewModel } from './SpecialIslandRollDialog.map';
import { styles } from './SpecialIslandRollDialog.styles';
import type { SpecialIslandRollDialogProps } from './SpecialIslandRollDialog.types';

export function SpecialIslandRollDialog({ state, onRoll, onClose }: SpecialIslandRollDialogProps) {
  if (!state) return null;
  const viewModel = toSpecialIslandRollViewModel(state);

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Image
                src="/sprites/icon_gold.png"
                alt="Treasure"
                width={24}
                height={24}
                className={styles.iconImage}
                unoptimized
              />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Special Island Treasure</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Roll the ancient dice: rolling a 3 or 6 unlocks a rare special card!
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.body}>
          {!viewModel.isRolled ? (
            <div className={styles.diceWrap}>
              <Dices className={styles.diceIcon} />
            </div>
          ) : (
            <div className={styles.resultWrap}>
              <span className={styles.resultLabel}>Result</span>
              <div className={styles.resultDie({ hasCard: viewModel.cardDrawn !== null })}>{viewModel.roll}</div>
            </div>
          )}

          {viewModel.isRolled && (
            <div className={styles.outcome}>
              {viewModel.cardDrawn ? (
                <>
                  <div className={styles.unlockedRow}>
                    <Sparkles className={styles.unlockedIcon} />
                    <span>Treasure Unlocked!</span>
                  </div>
                  <p className={styles.cardAcquired}>
                    Card Acquired: <span className={styles.cardName}>{viewModel.cardDrawn}</span>
                  </p>
                  <p className={styles.cardDescription}>&quot;{viewModel.cardDescription}&quot;</p>
                </>
              ) : (
                <>
                  <div className={styles.noTreasureRow}>
                    <XCircle className={styles.noTreasureIcon} />
                    <span>No Treasure This Time</span>
                  </div>
                  <p className={styles.noTreasureHint}>Better fortune on your next discovery!</p>
                </>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className={styles.footer}>
          {!viewModel.isRolled ? (
            <Button onClick={onRoll} className={styles.rollButton}>
              <Dices className={styles.rollIcon} />
              Roll for Treasure (3 or 6)
            </Button>
          ) : (
            <Button onClick={onClose} className={styles.closeButton}>
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
