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
import { ResourceIcon } from '@/components/icons';
import { toWealthyDialogViewModel } from './WealthyDialog.map';
import { styles } from './WealthyDialog.styles';
import type { WealthyDialogProps } from './WealthyDialog.types';

export function WealthyDialog({ onSelectResource, onClose }: WealthyDialogProps) {
  const viewModel = toWealthyDialogViewModel();

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Image
                src="/sprites/icon_gold.png"
                alt="Wealth"
                width={24}
                height={24}
                className={styles.iconImage}
                unoptimized
              />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Royal Wealth Bounty</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Select a stockpile resource to instantly receive 5 bonus units.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.grid}>
          {viewModel.options.map((option) => (
            <button
              key={option.resource}
              type="button"
              data-testid={`wealthy-resource-${option.resource}`}
              onClick={() => onSelectResource(option.resource)}
              className={styles.optionButton}
            >
              <div className={styles.spriteWrap}>
                <Image
                  src={option.sprite}
                  alt={option.displayName}
                  width={48}
                  height={48}
                  className={styles.sprite}
                  unoptimized
                />
              </div>

              <div className={styles.resourceRow}>
                <ResourceIcon type={option.resource} className={styles.resourceIcon} />
                <span className={styles.resourceName}>{option.displayName}</span>
              </div>

              <span className={styles.amount}>+5 Units</span>
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
