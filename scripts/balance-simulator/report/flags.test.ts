import { computeConfigMetrics } from '../metrics/index';
import { match, seatFinal, turn } from '../metrics/test-fixtures';
import { collectFlags } from './flags';

describe('collectFlags', () => {
  it('reports a capped-match breach with the config label', () => {
    const results = Array.from({ length: 10 }, () => match({ outcome: 'capped', winnerSeat: null, finalState: [seatFinal()] }));
    const metrics = computeConfigMetrics(results, 2, true, 30);

    const flags = collectFlags(metrics);
    expect(flags).toContainEqual({ severity: 'breach', text: '2p, fog on: 100.0% of matches were capped (stalling)' });
  });

  it('reports an M10 health flag as "health", never suppressed', () => {
    const results = [
      match({ outcome: 'capped', turns: [turn({ seat: 0, hasArmyOffOwnBase: false })], finalState: [seatFinal()] }),
    ];
    const metrics = computeConfigMetrics(results, 1, true, 30);

    expect(collectFlags(metrics).some((f) => f.severity === 'health')).toBe(true);
  });

  it('downgrades a balance flag to "suppressed" when the config is gated by bot health', () => {
    // A seat that never leaves base (an M10 health flag) alongside a lopsided win split: the win
    // split should report as suppressed, not breach, once the health gate is on.
    const results = Array.from({ length: 20 }, () =>
      match({
        winnerSeat: 0,
        turns: [turn({ seat: 0, hasArmyOffOwnBase: false }), turn({ seat: 1, hasArmyOffOwnBase: true })],
        finalState: [seatFinal(), seatFinal()],
      }),
    );
    const metrics = computeConfigMetrics(results, 2, true, 30);

    expect(metrics.gatedByBotHealth).toBe(true);
    const winFlag = collectFlags(metrics).find((f) => f.text.includes('win rates are not evenly split'));
    expect(winFlag?.severity).toBe('suppressed');
  });

  it('reports no flags for a healthy, balanced config', () => {
    const results = [
      match({
        winnerSeat: 0,
        turns: [turn({ seat: 0, hasArmyOffOwnBase: true }), turn({ seat: 1, hasArmyOffOwnBase: true })],
        finalState: [seatFinal(), seatFinal()],
      }),
    ];
    const metrics = computeConfigMetrics(results, 2, true, 30);

    expect(collectFlags(metrics)).toEqual([]);
  });
});
