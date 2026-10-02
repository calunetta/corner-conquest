import { chiSquareGoodnessOfFit, pooledZTest, summarizeDistribution, wilsonInterval } from './stats';

describe('wilsonInterval', () => {
  it('returns 0/0/0 for zero trials', () => {
    expect(wilsonInterval(0, 0)).toEqual({ proportion: 0, low: 0, high: 0 });
  });

  it('centers on the observed proportion and widens for fewer trials', () => {
    const small = wilsonInterval(5, 10);
    const large = wilsonInterval(50, 100);

    expect(small.proportion).toBe(0.5);
    expect(large.proportion).toBe(0.5);
    expect(small.high - small.low).toBeGreaterThan(large.high - large.low);
  });

  it('matches a hand-computed reference value (10/40, Wilson 95%)', () => {
    const { low, high } = wilsonInterval(10, 40);
    // z = 1.959963984540054 (97.5th percentile of the standard normal), computed independently.
    expect(low).toBeCloseTo(0.14187, 4);
    expect(high).toBeCloseTo(0.40194, 4);
  });

  it('never produces bounds outside [0, 1]', () => {
    expect(wilsonInterval(1, 1).high).toBeLessThanOrEqual(1);
    expect(wilsonInterval(0, 1).low).toBeGreaterThanOrEqual(0);
  });
});

describe('chiSquareGoodnessOfFit', () => {
  it('is zero for a perfectly uniform split', () => {
    const result = chiSquareGoodnessOfFit([25, 25, 25, 25]);
    expect(result.statistic).toBe(0);
    expect(result.exceedsCriticalValue).toBe(false);
  });

  it('uses count-1 degrees of freedom and the matching critical value', () => {
    expect(chiSquareGoodnessOfFit([10, 10]).degreesOfFreedom).toBe(1);
    expect(chiSquareGoodnessOfFit([10, 10]).criticalValue5pct).toBe(3.84);
    expect(chiSquareGoodnessOfFit([10, 10, 10]).criticalValue5pct).toBe(5.99);
    expect(chiSquareGoodnessOfFit([10, 10, 10, 10]).criticalValue5pct).toBe(7.81);
  });

  it('flags a lopsided split as exceeding the critical value', () => {
    // 90 vs 10 vs 10 vs 10, expected 30 each (df 3):
    // (90-30)^2/30 + 3*(10-30)^2/30 = 120 + 40 = 160, far above 7.81.
    const result = chiSquareGoodnessOfFit([90, 10, 10, 10]);
    expect(result.statistic).toBeCloseTo(160, 5);
    expect(result.exceedsCriticalValue).toBe(true);
  });
});

describe('pooledZTest', () => {
  const trial = (won: boolean, winProbability: number) => ({ won, winProbability });

  it('is zero when wins exactly match expectation', () => {
    // 4 trials at p=0.5, exactly 2 wins: observed == expected.
    const result = pooledZTest([trial(true, 0.5), trial(true, 0.5), trial(false, 0.5), trial(false, 0.5)]);
    expect(result.observedWins).toBe(2);
    expect(result.expectedWins).toBe(2);
    expect(result.z).toBeCloseTo(0, 5);
    expect(result.exceedsThreshold).toBe(false);
  });

  it('flags a large deviation from expectation', () => {
    // 100 trials at p=0.5 (expected 50, variance 25, so SD 5), observing 80 wins: z = 6, far beyond 3.
    const trials = [
      ...Array.from({ length: 80 }, () => trial(true, 0.5)),
      ...Array.from({ length: 20 }, () => trial(false, 0.5)),
    ];
    const result = pooledZTest(trials);
    expect(result.expectedWins).toBe(50);
    expect(result.z).toBeCloseTo(6, 5);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('is unaffected by trials with zero variance (winProbability of 0 or 1)', () => {
    const result = pooledZTest([trial(true, 1), trial(true, 1), trial(true, 1)]);
    expect(result.z).toBe(0);
  });

  it('returns zero for no trials', () => {
    expect(pooledZTest([])).toEqual({ observedWins: 0, expectedWins: 0, z: 0, exceedsThreshold: false });
  });
});

describe('summarizeDistribution', () => {
  it('returns zeros for an empty sample', () => {
    expect(summarizeDistribution([])).toEqual({ mean: 0, p10: 0, median: 0, p90: 0 });
  });

  it('computes mean and percentiles for a simple sample', () => {
    const result = summarizeDistribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.mean).toBe(5.5);
    expect(result.median).toBeCloseTo(5.5, 5);
    expect(result.p10).toBeCloseTo(1.9, 5);
    expect(result.p90).toBeCloseTo(9.1, 5);
  });

  it('does not depend on input order', () => {
    const ordered = summarizeDistribution([5, 1, 9, 3, 7]);
    const shuffled = summarizeDistribution([9, 7, 5, 3, 1]);
    expect(ordered).toEqual(shuffled);
  });
});
