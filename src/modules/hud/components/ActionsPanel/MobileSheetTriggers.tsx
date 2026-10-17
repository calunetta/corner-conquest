'use client';

import { Button } from '@/components/ui/button';
import { RegistryIcon } from '@/modules/shared';
import { styles } from './MobileActionsBar.styles';

export interface MobileSheetTriggersProps {
  onOpenLog: () => void;
  onOpenActions: () => void;
  logButtonRef: React.RefObject<HTMLButtonElement>;
  moreActionsButtonRef: React.RefObject<HTMLButtonElement>;
}

/** Right-hand Row 1 pair on mobile: "Log" (Event Log sheet) and "More Actions" (actions sheet). */
export function MobileSheetTriggers({
  onOpenLog,
  onOpenActions,
  logButtonRef,
  moreActionsButtonRef,
}: MobileSheetTriggersProps) {
  return (
    <div className={styles.triggerButtonGroup}>
      <Button
        ref={logButtonRef}
        variant="outline"
        size="sm"
        className={styles.logButton}
        onClick={onOpenLog}
        aria-label="Open event log"
        data-testid="actions-panel-log"
      >
        <RegistryIcon id="scroll-text" className={styles.logButtonIcon} aria-hidden />
        Log
      </Button>
      <Button
        ref={moreActionsButtonRef}
        variant="outline"
        size="sm"
        className={styles.moreActionsButton}
        onClick={onOpenActions}
        data-testid="actions-panel-more-actions"
      >
        More Actions
        <RegistryIcon id="chevron-up" className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
