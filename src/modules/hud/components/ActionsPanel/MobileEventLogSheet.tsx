'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { GameLogView } from '../GameLog/GameLog';
import { useGameLog } from '../GameLog/GameLog.hook';
import { styles } from './MobileActionsBar.styles';

export interface MobileEventLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

/**
 * Reads the log only while the sheet is mounted. Radix does not mount SheetContent's children
 * while closed, so the closed bar never needs the board context.
 */
function MobileEventLogContent() {
  return <GameLogView {...useGameLog()} variant="sheet" />;
}

/** Mobile bottom sheet that shows the Event Log on demand. Its header is GameLogView's own title and toggle. */
export function MobileEventLogSheet({ open, onOpenChange, triggerRef }: MobileEventLogSheetProps) {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // Restore focus to the "Log" trigger once the sheet closes, same as MobileActionsSheet.
    if (!newOpen && triggerRef?.current) {
      setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* Radix requires a DialogTitle. The visible title is GameLogView's header, so this one is sr-only. */}
      {/* No description: undefined stops Radix's missing-Description warning. */}
      <SheetContent
        side="bottom"
        className={styles.logSheetContent}
        aria-describedby={undefined}
      >
        <SheetTitle className={styles.logSheetSrTitle}>Event Log</SheetTitle>
        <MobileEventLogContent />
      </SheetContent>
    </Sheet>
  );
}
