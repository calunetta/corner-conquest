'use client';

import { WifiOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useConnectionWarning } from './ConnectionWarningDialog.hook';
import { styles } from './ConnectionWarningDialog.styles';
import type { ConnectionWarningViewModel } from './ConnectionWarningDialog.types';

/**
 * Escape must not close the warning: the player may not be looking, and the seat is still
 * at risk until the connection is restored or the takeover happens. Overlay clicks are
 * already ignored by Radix AlertDialog, so only Escape needs suppressing here.
 */
function keepOpen(event: Event): void {
  event.preventDefault();
}

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function ConnectionWarningDialogView({
  isOpen,
  isExpiring,
  countdownLabel,
}: ConnectionWarningViewModel): JSX.Element {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent onEscapeKeyDown={keepOpen}>
        <AlertDialogHeader>
          <div className={styles.titleRow}>
            <WifiOff className={styles.icon({ isExpiring })} />
            <AlertDialogTitle>Connection lost</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            We haven&apos;t heard from you in a while. Reconnect now or a bot will take over your seat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className={styles.countdown({ isExpiring })}>{countdownLabel}</p>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Connected component for the game board: reads the connection state through its hook. */
export function ConnectionWarningDialog(): JSX.Element {
  return <ConnectionWarningDialogView {...useConnectionWarning()} />;
}
