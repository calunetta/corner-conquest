import type { Anomaly, MatchResult } from '../engine';

export interface AnomalyMetrics {
  totalAnomalies: number;
  matchesWithAnomalies: number;
  totalMatches: number;
  /** One row per distinct (kind, message) pair, sorted by count descending. */
  byMessage: Array<{ kind: Anomaly['kind']; message: string; count: number; exampleSeat: number; exampleRound: number }>;
}

type AnomalyRow = AnomalyMetrics['byMessage'][number];

export function computeAnomalies(results: MatchResult[]): AnomalyMetrics {
  const totalMatches = results.length;
  let totalAnomalies = 0;
  let matchesWithAnomalies = 0;
  const rowsByKey = new Map<string, AnomalyRow>();

  results.forEach((result) => {
    let matchHasAnomaly = false;

    result.turns.forEach((turn) => {
      turn.anomalies.forEach((anomaly) => {
        matchHasAnomaly = true;
        totalAnomalies += 1;

        const key = `${anomaly.kind}::${anomaly.message}`;
        const existingRow = rowsByKey.get(key);
        if (existingRow) {
          existingRow.count += 1;
        } else {
          rowsByKey.set(key, {
            kind: anomaly.kind,
            message: anomaly.message,
            count: 1,
            exampleSeat: turn.seat,
            exampleRound: turn.round,
          });
        }
      });
    });

    if (matchHasAnomaly) matchesWithAnomalies += 1;
  });

  const byMessage = [...rowsByKey.values()].sort((a, b) => b.count - a.count);

  return { totalAnomalies, matchesWithAnomalies, totalMatches, byMessage };
}
