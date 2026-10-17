'use client';

import { RegistryIcon } from '@/modules/shared';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
  isDismissing,
  onDismiss,
}: ConnectionWarningViewModel): JSX.Element {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent onEscapeKeyDown={keepOpen}>
        <AlertDialogHeader>
          <div className={styles.titleRow}>
            <RegistryIcon id="wifi-off" className={styles.icon({ isExpiring })} />
            <AlertDialogTitle>Connection lost</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            We haven&apos;t heard from you in a while. Reconnect now or a bot will take over your seat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className={styles.countdown({ isExpiring })}>{countdownLabel}</p>
        <AlertDialogFooter>
          <Button onClick={onDismiss} disabled={isDismissing} className={styles.dismissButton}>
            {isDismissing ? (
              <RegistryIcon id="loader-2" className={styles.dismissIcon({ isPending: true })} aria-hidden />
            ) : (
              <RegistryIcon id="refresh-cw" className={styles.dismissIcon({ isPending: false })} aria-hidden />
            )}
            {isDismissing ? 'Checking…' : "I'm back"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Connected component for the game board: reads the connection state through its hook. */
export function ConnectionWarningDialog(): JSX.Element {
  return <ConnectionWarningDialogView {...useConnectionWarning()} />;
}
