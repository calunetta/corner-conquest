import { GameStatus } from '@/lib/types';
import { toConnectionWarningViewModel } from './ConnectionWarningDialog.map';

const WARNING_THRESHOLD_MS = 25_000;
const STALE_THRESHOLD_MS = 45_000;
const NOW = 1_000_000;

describe('toConnectionWarningViewModel', () => {
  it.each([
    ['Waiting', GameStatus.Waiting],
    ['Finished', GameStatus.Finished],
  ])('is closed when the game status is %s, regardless of elapsed time', (_label, status) => {
    const result = toConnectionWarningViewModel(
      NOW - WARNING_THRESHOLD_MS - 1,
      NOW,
      status,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.isOpen).toBe(false);
  });

  it('is closed for a bot seat even when lastSeenAt is old', () => {
    const result = toConnectionWarningViewModel(
      NOW - WARNING_THRESHOLD_MS - 1,
      NOW,
      GameStatus.Playing,
      true,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.isOpen).toBe(false);
  });

  it('is closed when lastSeenAt is null (no heartbeat yet)', () => {
    const result = toConnectionWarningViewModel(
      null,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.isOpen).toBe(false);
  });

  it('is closed when elapsed time is exactly at warningThresholdMs (strictly greater, not >=)', () => {
    const result = toConnectionWarningViewModel(
      NOW - WARNING_THRESHOLD_MS,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.isOpen).toBe(false);
  });

  it('is open when elapsed time is one ms past warningThresholdMs', () => {
    const result = toConnectionWarningViewModel(
      NOW - WARNING_THRESHOLD_MS - 1,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.isOpen).toBe(true);
  });

  it('floors remainingMs at 0 once elapsed exceeds staleThresholdMs (no negative countdown)', () => {
    const result = toConnectionWarningViewModel(
      NOW - STALE_THRESHOLD_MS - 60_000,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.countdownLabel).toBe('Taking over in 0:00');
    expect(result.isExpiring).toBe(true);
  });

  it('is not expiring with more than 10s remaining', () => {
    const result = toConnectionWarningViewModel(
      NOW - STALE_THRESHOLD_MS + 10_001,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.isExpiring).toBe(false);
  });

  it('flips isExpiring at exactly 10_000ms remaining (boundary is <=, not <)', () => {
    const result = toConnectionWarningViewModel(
      NOW - STALE_THRESHOLD_MS + 10_000,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.isExpiring).toBe(true);
  });

  it('formats a countdown label of 125_000ms as "Taking over in 2:05"', () => {
    const result = toConnectionWarningViewModel(
      NOW,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      125_000,
    );

    expect(result.countdownLabel).toBe('Taking over in 2:05');
  });

  it('formats a countdown label of 0ms as "Taking over in 0:00"', () => {
    const result = toConnectionWarningViewModel(
      NOW - STALE_THRESHOLD_MS,
      NOW,
      GameStatus.Playing,
      false,
      WARNING_THRESHOLD_MS,
      STALE_THRESHOLD_MS,
    );

    expect(result.countdownLabel).toBe('Taking over in 0:00');
  });
});
