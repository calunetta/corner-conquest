'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ActionButton } from './ActionButton';
import { styles } from './MobileActionsBar.styles';
import type { MobileActionsSheetProps } from './ActionsPanel.types';

interface MobileActionsSheetInternalProps extends MobileActionsSheetProps {
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

/** Mobile sheet overlay for secondary actions (Upgrade, Buy Card, Cards, Abilities). */
export function MobileActionsSheet({
  open,
  onOpenChange,
  secondaryActions,
  deckCount,
  infoBeacon,
  onActionClick,
  triggerRef,
}: MobileActionsSheetInternalProps) {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // Restore focus to trigger button when closing
    if (!newOpen && triggerRef?.current) {
      // Use setTimeout to ensure focus is restored after the sheet animation completes
      setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Escape key to close the sheet
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      handleOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className={styles.sheetContent} onKeyDown={handleKeyDown}>
        <SheetHeader className={styles.sheetHeader}>
          <div className="flex items-center justify-between">
            <SheetTitle className={styles.sheetTitle}>
              Actions
              {infoBeacon && infoBeacon}
            </SheetTitle>
          </div>
          <div className={styles.sheetDeckCount}>Cards left in deck: {deckCount}</div>
        </SheetHeader>
        <div className={styles.sheetBody}>
          {secondaryActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              isMain={false}
              disabledReasonVisible
              onActionClick={onActionClick}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
