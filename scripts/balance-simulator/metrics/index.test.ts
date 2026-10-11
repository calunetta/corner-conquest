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
    expect(metrics.anomalies).toEqual({
      totalAnomalies: 0,
      matchesWithAnomalies: 0,
      totalMatches: 1,
      byMessage: [],
    });
  });

  it('surfaces a seeded anomaly from computeAnomalies unchanged', () => {
    const anomaly = { kind: 'reducerError' as const, message: 'Error handling action Deploy: boom' };
    const results = [
      match({
        outcome: 'capped', // anomaly surfacing does not depend on the match having a winner
        turns: [turn({ seat: 0, round: 3, anomalies: [anomaly] })],
        finalState: [seatFinal(), seatFinal()],
      }),
    ];

    const metrics = computeConfigMetrics(results, 2, true, 30);

    expect(metrics.anomalies.totalAnomalies).toBe(1);
    expect(metrics.anomalies.matchesWithAnomalies).toBe(1);
    expect(metrics.anomalies.byMessage).toEqual([
      { kind: 'reducerError', message: anomaly.message, count: 1, exampleSeat: 0, exampleRound: 3 },
    ]);
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
