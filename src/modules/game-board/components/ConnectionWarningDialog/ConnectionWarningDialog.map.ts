import { GameStatus } from '@/lib/types';
import type { ConnectionWarningViewModel } from './ConnectionWarningDialog.types';

const EXPIRING_THRESHOLD_MS = 10_000;

/** Mirrors turn-timer.hook.ts's m:ss, but minutes are not zero-padded (ui-design.md: "0:18"). */
function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Pure transform from the local player's heartbeat state to the dialog's view model. Takes the
 * two thresholds as parameters so this file has no runtime dependency on game-board.staleness.hook.
 */
export function toConnectionWarningViewModel(
  lastSeenAt: number | null,
  now: number,
  status: GameStatus,
  isBot: boolean,
  warningThresholdMs: number,
  staleThresholdMs: number,
): Omit<ConnectionWarningViewModel, 'isDismissing' | 'onDismiss'> {
  const elapsedMs = lastSeenAt === null ? 0 : now - lastSeenAt;
  const isOpen =
    status === GameStatus.Playing && !isBot && lastSeenAt !== null && elapsedMs > warningThresholdMs;

  const remainingMs = Math.max(0, staleThresholdMs - elapsedMs);
  const isExpiring = remainingMs <= EXPIRING_THRESHOLD_MS;

  return {
    isOpen,
    isExpiring,
    countdownLabel: `Taking over in ${formatCountdown(remainingMs)}`,
  };
}
