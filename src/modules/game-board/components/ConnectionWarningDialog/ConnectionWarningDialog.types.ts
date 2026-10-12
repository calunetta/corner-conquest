export interface ConnectionWarningViewModel {
  isOpen: boolean;
  /** True once remaining time to takeover is <= 10_000 ms. */
  isExpiring: boolean;
  /** e.g. "Taking over in 0:18" */
  countdownLabel: string;
  /** True while the forced heartbeat write from onDismiss is in flight. */
  isDismissing: boolean;
  /** Forces a fresh heartbeat write; closes the dialog only if it succeeds (reactively, once
   *  lastSeenAt updates through the normal Firestore subscription — this does not set isOpen
   *  itself). On failure, re-enables and shows a destructive toast, unless the dialog has
   *  already closed through another path (automatic recovery or takeover) by the time the
   *  write settles, in which case it does nothing. */
  onDismiss: () => void;
}
