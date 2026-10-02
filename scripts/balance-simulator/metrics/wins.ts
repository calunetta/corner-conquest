import type { MatchResult } from '../engine';
import {
  chiSquareGoodnessOfFit,
  wilsonInterval,
  type ChiSquareResult,
  type WilsonInterval,
} from '../stats';

function zeros(count: number): number[] {
  return new Array(count).fill(0);
}

// --- M3: win distribution -----------------------------------------------------------------------

export interface WinMetrics {
  decidedMatches: number;
  bySeat: Array<{ seat: number; wins: number; wilson: WilsonInterval }>;
  /** `null` when there are fewer than 5x the seat count of decided matches — too few to test. */
  chiSquare: ChiSquareResult | null;
}

export function computeM3(results: MatchResult[], seatCount: number): WinMetrics {
  const decided = results.filter((r) => r.winnerSeat !== null);
  const winsBySeat = zeros(seatCount);
  decided.forEach((r) => {
    winsBySeat[r.winnerSeat as number] += 1;
  });

  return {
    decidedMatches: decided.length,
    bySeat: winsBySeat.map((wins, seat) => ({ seat, wins, wilson: wilsonInterval(wins, decided.length) })),
    chiSquare: decided.length >= 5 * seatCount ? chiSquareGoodnessOfFit(winsBySeat) : null,
  };
}

// --- M4: victory points --------------------------------------------------------------------------

export interface VictoryPointMetrics {
  meanFinalVictoryPoints: number[]; // by seat
  meanWinnerMargin: number; // winner - runner-up, only over finished matches
  meanWinnerOvershoot: number; // winner VP - goal, only over finished matches
}

export function computeM4(results: MatchResult[], seatCount: number, victoryPointGoal: number): VictoryPointMetrics {
  const vpTotals = zeros(seatCount);
  results.forEach((r) => r.finalState.forEach((seat, i) => (vpTotals[i] += seat.victoryPoints)));

  const finished = results.filter((r) => r.outcome === 'finished');
  const margins = finished.map((r) => {
    const sorted = [...r.finalState.map((s) => s.victoryPoints)].sort((a, b) => b - a);
    return sorted[0] - sorted[1];
  });
  const overshoots = finished.map((r) => r.finalState[r.winnerSeat as number].victoryPoints - victoryPointGoal);

  return {
    meanFinalVictoryPoints: vpTotals.map((total) => (results.length === 0 ? 0 : total / results.length)),
    meanWinnerMargin: margins.length === 0 ? 0 : margins.reduce((a, b) => a + b, 0) / margins.length,
    meanWinnerOvershoot: overshoots.length === 0 ? 0 : overshoots.reduce((a, b) => a + b, 0) / overshoots.length,
  };
}

