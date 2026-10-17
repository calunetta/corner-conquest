'use client';

import { useState } from 'react';
import { usePlayer } from '../../player.provider';
import { deleteAccount } from '../../services/account.service';
import type { DeleteAccountButtonViewProps, DeleteAccountDialogView } from './DeleteAccountButton.types';

const RECENT_LOGIN_MESSAGE =
  'Your account data was removed, but sign-in could not be fully deleted because your session is too old. Reload the page and try again.';
const CANCELLED_POPUP_MESSAGE =
  'Google sign-in was cancelled. Your account data was removed, but the sign-in itself was not deleted. Try again to finish.';
const GENERIC_MESSAGE = 'Could not delete your account. Please try again.';

function getErrorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

function toErrorMessage(error: unknown): string {
  const code = getErrorCode(error);
  if (code === 'auth/requires-recent-login') {
    return RECENT_LOGIN_MESSAGE;
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return CANCELLED_POPUP_MESSAGE;
  }
  return GENERIC_MESSAGE;
}

/** Dialog state machine (confirm, deleting, error) around the deleteAccount service call. */
export function useDeleteAccountButton(): DeleteAccountButtonViewProps {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<DeleteAccountDialogView>('confirm');
  const [errorMessage, setErrorMessage] = useState('');
  const { username } = usePlayer();

  const handleOpenChange = (open: boolean): void => {
    // Escape or an outside click must not hide an in-flight deletion.
    if (view === 'deleting') {
      return;
    }
    if (open) {
      setView('confirm');
    }
    setIsDialogOpen(open);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    setView('deleting');
    try {
      await deleteAccount(username);
      setIsDialogOpen(false);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      setView('error');
    }
  };

  return {
    isDialogOpen,
    view,
    errorMessage,
    onOpenChange: handleOpenChange,
    onConfirmDelete: handleConfirmDelete,
  };
}
