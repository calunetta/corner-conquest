'use client';

import Image from 'next/image';
import { Anchor } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ResourceIcon } from '@/modules/shared';
import { toPositionDialogViewModel } from './PositionDialog.map';
import { styles } from './PositionDialog.styles';
import type { PositionDialogProps, PositionOptionViewModel } from './PositionDialog.types';

export function PositionDialog({ resources, onSelect, onClose }: PositionDialogProps) {
  const viewModel = toPositionDialogViewModel(resources);

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        <AlertDialogHeader className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.iconWrap}>
              <Anchor className={styles.icon} />
            </div>
            <div>
              <AlertDialogTitle className={styles.title}>Position Army Collector</AlertDialogTitle>
              <AlertDialogDescription className={styles.description}>
                Select an available resource node to establish an active collection garrison.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className={styles.grid}>
          {viewModel.options.map((option: PositionOptionViewModel) => (
            <button
              key={option.type}
              type="button"
              data-testid={`position-resource-btn-${option.type}`}
              onClick={() => onSelect(option.type)}
              className={styles.option}
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

              <div className={styles.nameRow}>
                <ResourceIcon type={option.type} className={styles.resourceIcon} />
                <span className={styles.name}>{option.displayName}</span>
              </div>

              <span className={styles.amount}>+{option.amount} / turn</span>
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
