'use client';

import { useState } from 'react';
import { usePlayer } from '../../player.provider';
import type {
  LinkGoogleAccountButtonErrorDialog,
  LinkGoogleAccountButtonViewProps,
} from './LinkGoogleAccountButton.types';

const CLOSED_DIALOG: LinkGoogleAccountButtonErrorDialog = { open: false, title: '', description: '' };

const ALREADY_LINKED_DIALOG: LinkGoogleAccountButtonErrorDialog = {
  open: true,
  title: 'Account Already Linked',
  description:
    'This Google account is already linked to a different Corner Conquest profile. Sign out and sign in with that Google account instead, or link a different one.',
};

const LINK_FAILED_DIALOG: LinkGoogleAccountButtonErrorDialog = {
  open: true,
  title: 'Linking Failed',
  description: 'Could not link your Google account. Please try again.',
};

function getErrorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

function isCredentialAlreadyInUse(error: unknown): boolean {
  return getErrorCode(error) === 'auth/credential-already-in-use';
}

/** Closing the popup is a choice, not a failure, so it shows no dialog. */
function isCancelledPopup(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

function toErrorDialog(error: unknown): LinkGoogleAccountButtonErrorDialog {
  return isCredentialAlreadyInUse(error) ? ALREADY_LINKED_DIALOG : LINK_FAILED_DIALOG;
}

/** Runs the guest-to-Google link and maps its Firebase error codes onto the error dialog. */
export function useLinkGoogleAccountButton(): LinkGoogleAccountButtonViewProps {
  const [isLinking, setIsLinking] = useState(false);
  const [errorDialog, setErrorDialog] = useState<LinkGoogleAccountButtonErrorDialog>(CLOSED_DIALOG);
  const { linkWithGoogle } = usePlayer();

  const handleLink = async (): Promise<void> => {
    setIsLinking(true);

    try {
      await linkWithGoogle();
    } catch (error) {
      if (!isCancelledPopup(error)) {
        setErrorDialog(toErrorDialog(error));
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleErrorDialogOpenChange = (open: boolean): void => {
    setErrorDialog((current) => ({ ...current, open }));
  };

  return {
    isLinking,
    errorDialog,
    onLink: handleLink,
    onErrorDialogOpenChange: handleErrorDialogOpenChange,
  };
}
