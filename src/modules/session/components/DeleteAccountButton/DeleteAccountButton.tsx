'use client';

import type { MouseEvent } from 'react';
import { RegistryIcon } from '@/modules/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteAccountButton } from './DeleteAccountButton.hook';
import { styles } from './DeleteAccountButton.styles';
import type { DeleteAccountButtonViewProps } from './DeleteAccountButton.types';

const CONFIRM_DESCRIPTION =
  'This permanently deletes your account and releases your username. This cannot be undone.';

/** Pure view: one dialog whose body switches on `view` (confirm, deleting, error). */
export function DeleteAccountButtonView({
  isDialogOpen,
  view,
  errorMessage,
  onOpenChange,
  onConfirmDelete,
}: DeleteAccountButtonViewProps) {
  const isDeleting = view === 'deleting';

  // Radix closes the dialog on action click; keep it open so 'deleting' and 'error' stay visible.
  const handleConfirmClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    onConfirmDelete();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={styles.triggerButton}
        onClick={() => onOpenChange(true)}
      >
        Delete Account
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          {view === 'error' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Deletion Failed</AlertDialogTitle>
                <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => onOpenChange(false)}>OK</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
                <AlertDialogDescription>{CONFIRM_DESCRIPTION}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={styles.confirmAction}
                  disabled={isDeleting}
                  onClick={handleConfirmClick}
                >
                  {isDeleting && <RegistryIcon id="loader-2" className={styles.spinnerIcon} aria-hidden />}
                  {isDeleting ? 'Deleting…' : 'Delete Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Connected component for the account settings area: reads the player session through its hook. */
export function DeleteAccountButton() {
  return <DeleteAccountButtonView {...useDeleteAccountButton()} />;
}
