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
import { TrendingUp, Check } from 'lucide-react';
import { useProductiveCardDialog } from './ProductiveCardDialog.hook';
import { styles } from './ProductiveCardDialog.styles';
import type { ProductiveCardDialogProps } from './ProductiveCardDialog.types';

export function ProductiveCardDialog(props: ProductiveCardDialogProps) {
  const { viewModel, onSelectResource, onConfirm } = useProductiveCardDialog(props);

  if (!viewModel) return null;

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <TrendingUp className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Productive Harvest</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Select one resource to double its harvest yield this turn.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.grid}>
          {viewModel.options.map((option) => (
            <button
              key={option.resource}
              type="button"
              data-testid={`productive-option-${option.resource}`}
              onClick={() => onSelectResource(option.resource)}
              className={styles.option({ isSelected: option.isSelected })}
            >
              {option.isSelected && (
                <div className={styles.selectedBadge}>
                  <Check className={styles.selectedIcon} />
                </div>
              )}

              <div className={styles.spriteWrap}>
                <Image
                  src={option.sprite}
                  alt={option.displayName}
                  width={44}
                  height={44}
                  className={styles.sprite}
                  unoptimized
                />
              </div>

              <div className={styles.nameRow}>
                <ResourceIcon type={option.resource} className={styles.resourceIcon} />
                <span className={styles.resourceName}>{option.displayName}</span>
              </div>

              <span className={styles.amount}>2x ({option.amount * 2})</span>
            </button>
          ))}
        </div>

        <AlertDialogFooter className={styles.footer}>
          <Button onClick={onConfirm} className={styles.confirmButton}>
            {viewModel.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
