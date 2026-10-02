import { computeM1, computeM2 } from './outcomes';
import { match } from './test-fixtures';

describe('computeM1', () => {
  it('counts finished and capped matches', () => {
    const results = [
      match({ outcome: 'finished', finalState: [] }),
      match({ outcome: 'finished', finalState: [] }),
      match({ outcome: 'capped', finalState: [] }),
    ];

    const m1 = computeM1(results);

    expect(m1).toEqual({ totalMatches: 3, finished: 2, capped: 1, finishedPct: (2 / 3) * 100, cappedPct: (1 / 3) * 100 });
  });

  it('returns zeros for an empty run', () => {
    expect(computeM1([])).toEqual({ totalMatches: 0, finished: 0, capped: 0, finishedPct: 0, cappedPct: 0 });
  });
});

describe('computeM2', () => {
  it('summarizes rounds of finished matches only, and sums bot turns across all matches', () => {
    const results = [
      match({ outcome: 'finished', rounds: 10, botTurns: 20, finalState: [] }),
      match({ outcome: 'finished', rounds: 30, botTurns: 60, finalState: [] }),
      match({ outcome: 'capped', rounds: 150, botTurns: 300, finalState: [] }),
    ];

    const m2 = computeM2(results);

    expect(m2.finishedRounds.mean).toBe(20); // only the two finished matches: (10+30)/2
    expect(m2.totalBotTurns).toBe(380); // all three matches
    expect(m2.pctFinishedByRound20).toBeCloseTo((1 / 3) * 100, 5); // only the round-10 match
    expect(m2.pctFinishedByRound40).toBeCloseTo((2 / 3) * 100, 5); // the round-10 and round-30 matches
  });
});
