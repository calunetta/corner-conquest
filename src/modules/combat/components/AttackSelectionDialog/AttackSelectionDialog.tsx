'use client';

import Image from 'next/image';
import { Anchor, CheckCircle, Crosshair } from 'lucide-react';
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
import { toAttackSelectionViewModel } from './AttackSelectionDialog.map';
import { styles } from './AttackSelectionDialog.styles';
import type { AttackArmyOptionViewModel, AttackSelectionDialogProps, ArmyStatus } from './AttackSelectionDialog.types';

const STATUS_ICON: Record<ArmyStatus, typeof CheckCircle> = {
  acted: CheckCircle,
  positioned: Anchor,
  ready: Crosshair,
};

const STATUS_LABEL: Record<ArmyStatus, string> = {
  acted: 'Acted',
  positioned: 'Positioned',
  ready: 'Ready',
};

export function AttackSelectionDialog({ state, onSelectTarget, onClose, isMyTurn }: AttackSelectionDialogProps) {
  // isMyTurn disables every button uniformly, not per-army — see AttackSelectionDialog.map.ts.
  const viewModel = toAttackSelectionViewModel(state, isMyTurn);
  if (!viewModel) return null;

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Crosshair className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Select Enemy Target</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Choose which of <span className={styles.defendingPlayerName}>{viewModel.defendingPlayerName}</span>{"'s"} squads to attack.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.grid}>
          {viewModel.armies.map((army: AttackArmyOptionViewModel) => {
            const StatusIcon = STATUS_ICON[army.status];
            return (
              <button
                key={army.id}
                type="button"
                disabled={!isMyTurn}
                onClick={() => isMyTurn && onSelectTarget(army.id)}
                className={cn(styles.armyButton, isMyTurn ? styles.armyButtonEnabled : styles.armyButtonDisabled)}
              >
                <div className={styles.spriteWrap}>
                  <Image
                    src={army.sprite}
                    alt={`Enemy Army ${army.id + 1}`}
                    width={40}
                    height={40}
                    className={styles.sprite}
                    unoptimized
                  />
                </div>
                <p className={styles.name}>Enemy Squad {army.id + 1}</p>
                <div className={cn(styles.statusRow, styles.statusColor[army.status])}>
                  <StatusIcon className={styles.statusIcon} />
                  <span>{STATUS_LABEL[army.status]}</span>
                </div>
              </button>
            );
          })}
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
