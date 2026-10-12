export interface ConnectionWarningViewModel {
  isOpen: boolean;
  /** True once remaining time to takeover is <= 10_000 ms. */
  isExpiring: boolean;
  /** e.g. "Taking over in 0:18" */
  countdownLabel: string;
}
