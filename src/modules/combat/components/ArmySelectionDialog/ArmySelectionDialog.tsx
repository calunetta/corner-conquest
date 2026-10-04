'use client';

import Image from 'next/image';
import { Anchor, CheckCircle, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FightIcon } from '@/modules/shared';
import { toArmySelectionViewModel } from './ArmySelectionDialog.map';
import { styles } from './ArmySelectionDialog.styles';
import type { ArmyOptionViewModel, ArmySelectionDialogProps, ArmyStatus } from './ArmySelectionDialog.types';

const STATUS_ICON: Record<ArmyStatus, typeof CheckCircle> = {
  acted: CheckCircle,
  positioned: Anchor,
  ready: Clock,
};

const STATUS_LABEL: Record<ArmyStatus, string> = {
  acted: 'Acted',
  positioned: 'Positioned',
  ready: 'Ready',
};

export function ArmySelectionDialog({
  state,
  player,
  onSelectArmy,
  onClose,
  isMyTurn,
  selectedArmyId,
}: ArmySelectionDialogProps) {
  const viewModel = toArmySelectionViewModel(state, player, isMyTurn, selectedArmyId);
  if (!viewModel) return null;

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <FightIcon className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>
                Select Army Squad ({viewModel.x}, {viewModel.y})
              </AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Multiple squads garrisoned here. Select which squad to order.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.grid}>
          {viewModel.armies.map((army: ArmyOptionViewModel) => {
            const StatusIcon = STATUS_ICON[army.status];
            return (
              <button
                key={army.id}
                type="button"
                disabled={!army.isSelectable}
                onClick={() => army.isSelectable && onSelectArmy(army.id)}
                className={cn(
                  styles.armyButton,
                  army.isSelected
                    ? styles.armyButtonSelected
                    : army.isSelectable
                      ? styles.armyButtonSelectable
                      : styles.armyButtonDisabled,
                )}
              >
                <div className={styles.spriteWrap}>
                  <Image
                    src={army.sprite}
                    alt={`Army ${army.id + 1}`}
                    width={40}
                    height={40}
                    className={styles.sprite}
                    unoptimized
                  />
                </div>
                <div className={styles.nameRow}>
                  <span className={styles.name}>Squad {army.id + 1}</span>
                  {army.isSelected && <Badge className={styles.activeBadge}>ACTIVE</Badge>}
                </div>
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
