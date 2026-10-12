import type { ConnectionWarningViewModel } from './ConnectionWarningDialog.types';

/** Shared by the tests and the testbed preview. Deterministic: no random values or dates. */
export const openWarningViewModel: ConnectionWarningViewModel = {
  isOpen: true,
  isExpiring: false,
  countdownLabel: 'Taking over in 0:18',
  isDismissing: false,
  onDismiss: () => {},
};

export const openExpiringViewModel: ConnectionWarningViewModel = {
  isOpen: true,
  isExpiring: true,
  countdownLabel: 'Taking over in 0:07',
  isDismissing: false,
  onDismiss: () => {},
};

export const dismissingViewModel: ConnectionWarningViewModel = {
  isOpen: true,
  isExpiring: false,
  countdownLabel: 'Taking over in 0:18',
  isDismissing: true,
  onDismiss: () => {},
};
