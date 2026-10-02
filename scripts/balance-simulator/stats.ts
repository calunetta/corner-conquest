/**
 * Statistics helpers for the balance report. Each function is intentionally small: the report
 * needs correct, auditable numbers, not a general-purpose statistics library.
 */

/** A 95% Wilson score interval for a binomial proportion — more reliable than normal-approximation
 *  intervals at the small sample sizes a single balance run can produce. */
export interface WilsonInterval {
  proportion: number;
  low: number;
  high: number;
}

const Z_95 = 1.959963984540054; // two-tailed 95% critical value

export function wilsonInterval(successes: number, trials: number): WilsonInterval {
  if (trials === 0) return { proportion: 0, low: 0, high: 0 };

  const p = successes / trials;
  const z2 = Z_95 * Z_95;
  const denominator = 1 + z2 / trials;
  const center = p + z2 / (2 * trials);
  const margin = Z_95 * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));

  return {
    proportion: p,
    low: (center - margin) / denominator,
    high: (center + margin) / denominator,
  };
}

/** Pearson's chi-squared goodness-of-fit test against a uniform expectation (every seat equally likely to win). */
export interface ChiSquareResult {
  statistic: number;
  degreesOfFreedom: number;
  /** The 5% critical value for this many degrees of freedom (df 1, 2 or 3 — this game has at most 4 seats). */
  criticalValue5pct: number;
  exceedsCriticalValue: boolean;
}

const CHI_SQUARE_CRITICAL_5PCT: Record<number, number> = { 1: 3.84, 2: 5.99, 3: 7.81 };

export function chiSquareGoodnessOfFit(observedCounts: number[]): ChiSquareResult {
  const total = observedCounts.reduce((sum, count) => sum + count, 0);
  const expected = total / observedCounts.length;
  const statistic =
    expected === 0 ? 0 : observedCounts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);
  const degreesOfFreedom = observedCounts.length - 1;
  const criticalValue5pct = CHI_SQUARE_CRITICAL_5PCT[degreesOfFreedom] ?? Infinity;

  return { statistic, degreesOfFreedom, criticalValue5pct, exceedsCriticalValue: statistic > criticalValue5pct };
}

/**
 * One-sample z-test across many individual trials with different win probabilities (e.g. combat
 * attempts at different attack-power-vs-monster-level pairs): how many standard deviations the
 * total observed win count is from the sum of each trial's expected win probability.
 */
export interface Trial {
  won: boolean;
  winProbability: number;
}

export interface PooledZTestResult {
  observedWins: number;
  expectedWins: number;
  z: number;
  exceedsThreshold: boolean;
}

export function pooledZTest(trials: Trial[]): PooledZTestResult {
  const observedWins = trials.reduce((sum, t) => sum + (t.won ? 1 : 0), 0);
  const expectedWins = trials.reduce((sum, t) => sum + t.winProbability, 0);
  const variance = trials.reduce((sum, t) => sum + t.winProbability * (1 - t.winProbability), 0);
  const z = variance === 0 ? 0 : (observedWins - expectedWins) / Math.sqrt(variance);

  return { observedWins, expectedWins, z, exceedsThreshold: Math.abs(z) > 3 };
}

/** Mean, and the p10/median/p90 percentiles, of a non-empty numeric sample. Linear interpolation. */
export interface Distribution {
  mean: number;
  p10: number;
  median: number;
  p90: number;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = fraction * (sorted.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  const weight = index - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

export function summarizeDistribution(values: number[]): Distribution {
  if (values.length === 0) return { mean: 0, p10: 0, median: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    mean: sorted.reduce((sum, v) => sum + v, 0) / sorted.length,
    p10: percentile(sorted, 0.1),
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
}
