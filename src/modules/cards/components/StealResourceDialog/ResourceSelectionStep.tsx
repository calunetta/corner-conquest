'use client';

import Image from 'next/image';
import { AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ResourceIcon } from '@/components/icons';
import { ArrowLeft, Check, HandMetal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { styles } from './StealResourceDialog.styles';
import type { ResourceSelectionStepProps } from './StealResourceDialog.types';

export function ResourceSelectionStep({
  playerName,
  options,
  canConfirm,
  selectedDisplayName,
  onSelectResource,
  onBack,
  onSteal,
}: ResourceSelectionStepProps) {
  return (
    <>
      <AlertDialogHeader className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.iconWrap}>
            <HandMetal className={styles.icon} />
          </div>
          <div>
            <AlertDialogTitle className={styles.title}>Steal from {playerName}</AlertDialogTitle>
            <AlertDialogDescription className={styles.description}>
              Select which stockpile resource to seize (2 units).
            </AlertDialogDescription>
          </div>
        </div>
      </AlertDialogHeader>

      <div className={styles.resourceGrid}>
        {options.map((option) => (
          <button
            key={option.resource}
            type="button"
            disabled={!option.isAvailable}
            data-testid={`steal-resource-${option.resource}`}
            onClick={() => onSelectResource(option.resource)}
            className={cn(
              styles.resourceButtonBase,
              !option.isAvailable
                ? styles.resourceButtonUnavailable
                : option.isSelected
                  ? styles.resourceButtonSelected
                  : styles.resourceButtonIdle,
            )}
          >
            {option.isSelected && (
              <div className={styles.selectedBadge}>
                <Check className={styles.selectedBadgeIcon} />
              </div>
            )}

            <div className={styles.resourceSpriteWrap}>
              <Image
                src={option.sprite}
                alt={option.displayName}
                width={44}
                height={44}
                className={styles.resourceSprite}
                unoptimized
              />
            </div>

            <div className={styles.resourceRow}>
              <ResourceIcon type={option.resource} className={styles.resourceIcon} />
              <span className={styles.resourceName}>{option.displayName}</span>
            </div>

            <span className={styles.availableLabel}>Avail: {option.available}</span>
          </button>
        ))}
      </div>

      <AlertDialogFooter className={styles.footerWithGap}>
        <Button variant="outline" size="sm" onClick={onBack} className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} /> Back
        </Button>
        <Button size="sm" disabled={!canConfirm} onClick={onSteal} className={styles.stealButton}>
          Steal 2 {selectedDisplayName ?? 'Resources'}
        </Button>
      </AlertDialogFooter>
    </>
  );
}
