import { computeConfigMetrics } from './index';
import { match, seatFinal, turn } from './test-fixtures';

describe('computeConfigMetrics', () => {
  it('wires players and fog through, and computes every sub-metric', () => {
    const results = [match({ winnerSeat: 0, finalState: [seatFinal({ victoryPoints: 30 }), seatFinal()] })];

    const metrics = computeConfigMetrics(results, 2, true, 30);

    expect(metrics.players).toBe(2);
    expect(metrics.fog).toBe(true);
    expect(metrics.m1.totalMatches).toBe(1);
    expect(metrics.m3.bySeat).toHaveLength(2);
    expect(metrics.m10.bySeat).toHaveLength(2);
  });

  it('is not gated by bot health when no M10 threshold is crossed', () => {
    const results = [
      match({
        outcome: 'capped', // gating only depends on M10 inputs, not the match outcome
        turns: [turn({ seat: 0, hasArmyOffOwnBase: true })],
        finalState: [seatFinal()],
      }),
    ];

    expect(computeConfigMetrics(results, 1, true, 30).gatedByBotHealth).toBe(false);
  });

  it('is gated by bot health when a seat never leaves its own base in any match', () => {
    const results = [
      match({
        outcome: 'capped', // gating only depends on M10 inputs, not the match outcome
        turns: [turn({ seat: 0, hasArmyOffOwnBase: false })],
        finalState: [seatFinal()],
      }),
    ];

    // 1/1 seats never left base = 100%, far over the 10% M10 threshold.
    expect(computeConfigMetrics(results, 1, true, 30).gatedByBotHealth).toBe(true);
  });
});
