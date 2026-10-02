import type { ConfigMetrics } from '../metrics/index';
import { collectFlags, type Flag } from './flags';
import { num, pct, table } from './markdown-tables';
import type { RunReport } from './types';

const configLabel = (m: ConfigMetrics) => `${m.players} players, fog ${m.fog ? 'on' : 'off'}`;

function readThisFirst(flags: Flag[]): string {
  if (flags.length === 0) return 'No M1, M10 or integrity flags fired across any config.';
  const bySeverity = (severity: Flag['severity']) => flags.filter((f) => f.severity === severity);
  const section = (title: string, items: Flag[]) =>
    items.length === 0 ? '' : `\n**${title}**\n${items.map((f) => `- ${f.text}`).join('\n')}\n`;

  return [
    section('Breaches', bySeverity('breach')),
    section('Bot health', bySeverity('health')),
    section('Suppressed (bot health)', bySeverity('suppressed')),
  ].join('');
}

function configSection(m: ConfigMetrics): string {
  const seats = m.m3.bySeat.map((w, seat) => [
    String(seat),
    String(w.wins),
    `[${pct(w.wilson.low * 100)}, ${pct(w.wilson.high * 100)}]`,
    num(m.m4.meanFinalVictoryPoints[seat]),
  ]);

  const cards = Object.entries(m.m8.byCard).map(([name, c]) => [name, String(c.acquired), String(c.consumed), String(c.held)]);

  const monsterRows = m.m9.monsterCells.map((c) => [
    c.monsterName,
    String(c.attackerDice),
    String(c.attempts),
    pct(c.observedWinPct),
    pct(c.expectedWinPct),
  ]);

  const health = m.m10.bySeat.map((h) => [
    String(h.seat),
    h.firstRoundOffOwnBase === null ? 'never' : String(h.firstRoundOffOwnBase),
    pct(h.pctPositionsOnOwnBase),
    h.trappedWithProductive ? 'yes' : 'no',
    h.everUnusedCards.join(', ') || '—',
  ]);

  return `
## ${configLabel(m)}

**M1 outcomes:** ${m.m1.finished}/${m.m1.totalMatches} finished (${pct(m.m1.finishedPct)}), ${pct(m.m1.cappedPct)} capped.
**M2 length:** finished matches average ${num(m.m2.finishedRounds.mean)} rounds (p10 ${num(m.m2.finishedRounds.p10)}, median ${num(m.m2.finishedRounds.median)}, p90 ${num(m.m2.finishedRounds.p90)}); ${pct(m.m2.pctFinishedByRound20)} done by round 20, ${pct(m.m2.pctFinishedByRound40)} by round 40. ${m.m2.totalBotTurns} total bot turns.

**M3/M4 wins and VP** (seat, wins, 95% CI, mean final VP)${m.gatedByBotHealth ? ' — suppressed as a balance signal, bot health issue present' : ''}:
${table(['Seat', 'Wins', '95% CI', 'Mean final VP'], seats)}
Winner margin: ${num(m.m4.meanWinnerMargin)} VP. Winner overshoot: ${num(m.m4.meanWinnerOvershoot)} VP.

**M8 cards** (acquired / consumed / held)${m.gatedByBotHealth ? ' — suppressed as a balance signal' : ''}:
${table(['Card', 'Acquired', 'Consumed', 'Held'], cards)}
Draws lost to a full hand: ${m.m8.drawsLostToFullHand}. Seats ending at 7 cards: ${pct(m.m8.pctSeatsAtSevenCards)}.

**M9 combat accuracy** (cells with ≥30 attempts; pooled z=${num(m.m9.pooledZ.z)}):
${monsterRows.length > 0 ? table(['Monster', 'Attacker dice', 'Attempts', 'Observed win %', 'Expected win %'], monsterRows) : '_No monster cell reached 30 attempts._'}
PvP: ${m.m9.pvpObserved.attempts} attempts, ${pct(m.m9.pvpObserved.attackerWinPct)} attacker win rate (observed only — see the guide's limitations).

**M10 bot health** (seat, first round off own Base, % positions on own Base, trapped, unused cards):
${table(['Seat', 'First off Base', '% on own Base', 'Trapped', 'Never-used cards'], health)}
`;
}

export function toMarkdown(report: RunReport): string {
  const { header } = report;
  const allFlags = report.configs.flatMap(collectFlags);

  return `# Corner Conquest balance report

Seed ${header.seed} · ${header.gamesPerConfig} games/config · max ${header.maxRounds} rounds · commit ${header.gitCommit} · generated ${header.generatedAt}
Settings: \`${JSON.stringify(header.settingsSnapshot)}\`

See \`docs/balance-simulator-guide.md\` for how to read every metric, its flag threshold, the bot-health gate, and this report's known limitations.

## Read this first
${readThisFirst(allFlags)}
${report.configs.map(configSection).join('\n')}`;
}
