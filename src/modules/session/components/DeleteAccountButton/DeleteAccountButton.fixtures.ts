import type { DeleteAccountButtonViewProps } from './DeleteAccountButton.types';

/** Shared by the tests and the testbed preview. Deterministic: no random values or dates. */
const noop = (): void => undefined;

export const confirmDeleteAccountButton: DeleteAccountButtonViewProps = {
  isDialogOpen: true,
  view: 'confirm',
  errorMessage: '',
  onOpenChange: noop,
  onConfirmDelete: noop,
};

export const deletingDeleteAccountButton: DeleteAccountButtonViewProps = {
  ...confirmDeleteAccountButton,
  view: 'deleting',
};

export const errorDeleteAccountButton: DeleteAccountButtonViewProps = {
  ...confirmDeleteAccountButton,
  view: 'error',
  errorMessage:
    'Your account data was removed, but sign-in could not be fully deleted because your session is too old. Reload the page and try again.',
};

export const closedDeleteAccountButton: DeleteAccountButtonViewProps = {
  ...confirmDeleteAccountButton,
  isDialogOpen: false,
};
