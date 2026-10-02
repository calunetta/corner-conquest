import type { MatchResult } from '../engine';
import { summarizeDistribution, type Distribution } from '../stats';

// --- M1: outcomes -----------------------------------------------------------------------------

export interface OutcomeMetrics {
  totalMatches: number;
  finished: number;
  capped: number;
  finishedPct: number;
  cappedPct: number;
}

export function computeM1(results: MatchResult[]): OutcomeMetrics {
  const finished = results.filter((r) => r.outcome === 'finished').length;
  const total = results.length;
  return {
    totalMatches: total,
    finished,
    capped: total - finished,
    finishedPct: total === 0 ? 0 : (finished / total) * 100,
    cappedPct: total === 0 ? 0 : ((total - finished) / total) * 100,
  };
}

// --- M2: match length ---------------------------------------------------------------------------

export interface LengthMetrics {
  finishedRounds: Distribution;
  pctFinishedByRound20: number;
  pctFinishedByRound40: number;
  totalBotTurns: number;
}

export function computeM2(results: MatchResult[]): LengthMetrics {
  const finished = results.filter((r) => r.outcome === 'finished');
  const rounds = finished.map((r) => r.rounds);
  return {
    finishedRounds: summarizeDistribution(rounds),
    pctFinishedByRound20: results.length === 0 ? 0 : (rounds.filter((r) => r <= 20).length / results.length) * 100,
    pctFinishedByRound40: results.length === 0 ? 0 : (rounds.filter((r) => r <= 40).length / results.length) * 100,
    totalBotTurns: results.reduce((sum, r) => sum + r.botTurns, 0),
  };
}

