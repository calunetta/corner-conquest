import type { ConfigMetrics } from '../metrics/index';

export interface Flag {
  /** "breach" is an unsuppressed balance concern; "health" is an M10 bot-health issue (never
   *  suppressed); "suppressed" is an M3-M8-activity flag hidden by the M10 gate per the Final spec. */
  severity: 'breach' | 'health' | 'suppressed';
  text: string;
}

const configLabel = (m: ConfigMetrics) => `${m.players}p, fog ${m.fog ? 'on' : 'off'}`;

/** M1, M10 and the M5/M8 integrity checks always report as "breach"; the remaining M3/M4/M8/M9
 *  balance flags report as "suppressed" instead when `gatedByBotHealth` is true, per the Final
 *  spec's gating rule ("if any M10 flag fires, the M5-M7 flags print as suppressed"). */
export function collectFlags(m: ConfigMetrics): Flag[] {
  const flags: Flag[] = [];
  const balance = (text: string) => flags.push({ severity: m.gatedByBotHealth ? 'suppressed' : 'breach', text });
  const label = configLabel(m);

  if (m.m1.cappedPct > 5) {
    flags.push({ severity: 'breach', text: `${label}: ${m.m1.cappedPct.toFixed(1)}% of matches were capped (stalling)` });
  }
  if (m.m2.finishedRounds.median > 30) {
    flags.push({ severity: 'breach', text: `${label}: median match length is ${m.m2.finishedRounds.median.toFixed(1)} rounds` });
  }
  if (m.m3.chiSquare?.exceedsCriticalValue) {
    balance(`${label}: win rates are not evenly split (χ²=${m.m3.chiSquare.statistic.toFixed(2)} > ${m.m3.chiSquare.criticalValue5pct})`);
  }
  if (m.m4.meanWinnerMargin > 15) balance(`${label}: mean winner margin is ${m.m4.meanWinnerMargin.toFixed(1)} VP`);
  if (m.m5.mismatchCount > 0) {
    flags.push({ severity: 'breach', text: `${label}: M5 integrity — ${m.m5.mismatchCount} match/seat sums exceeded the recorded final VP` });
  }
  if (m.m8.mismatchCount > 0) {
    flags.push({ severity: 'breach', text: `${label}: M8 integrity — ${m.m8.mismatchCount} card kind(s) have acquired ≠ consumed + held` });
  }
  if (m.m8.drawsLostToFullHand > 0) balance(`${label}: ${m.m8.drawsLostToFullHand} card draw(s) lost to a full hand`);
  if (m.m8.pctSeatsAtSevenCards > 25) balance(`${label}: ${m.m8.pctSeatsAtSevenCards.toFixed(1)}% of seats ended at the 7-card hand limit`);
  if (Math.abs(m.m9.pooledZ.z) > 3) {
    flags.push({ severity: 'breach', text: `${label}: M9 combat accuracy — |z|=${Math.abs(m.m9.pooledZ.z).toFixed(2)} (simulator or dice-math bug suspected)` });
  }

  if (m.m10.neverLeftBasePct > 10) {
    flags.push({ severity: 'health', text: `${label}: ${m.m10.neverLeftBasePct.toFixed(1)}% of seats never left their own Base` });
  }
  if (m.m10.basePositionsPct > 50) {
    flags.push({ severity: 'health', text: `${label}: ${m.m10.basePositionsPct.toFixed(1)}% of collection spots were on a seat's own Base` });
  }
  if (m.m10.trappedPct > 10) {
    flags.push({ severity: 'health', text: `${label}: ${m.m10.trappedPct.toFixed(1)}% of seats ended trapped (Productive in hand, resource position held)` });
  }

  return flags;
}
