import { useEffect } from 'react';

/** How long the covered tile stays covered before the next reveal. */
const COVERED_HOLD_MS = 1000;
/** Extra time after a pass finishes before the tile is covered again. */
const REVEALED_PAUSE_MS = 500;

/**
 * Testbed helper: while `enabled`, flips the tile between covered and revealed on a timer, so the
 * pass replays without clicking. Each reveal holds long enough for one full pass plus a pause.
 */
export function useRepeatingReveal(
  enabled: boolean,
  isCovered: boolean,
  passMs: number,
  setIsCovered: (covered: boolean) => void,
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const holdMs = isCovered ? COVERED_HOLD_MS : passMs + REVEALED_PAUSE_MS;
    const timer = setTimeout(() => setIsCovered(!isCovered), holdMs);
    return () => clearTimeout(timer);
  }, [enabled, isCovered, passMs, setIsCovered]);
}
