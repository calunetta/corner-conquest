import { computeConfigMetrics } from '../metrics/index';
import { match, seatFinal, turn } from '../metrics/test-fixtures';
import { toJson, toMarkdown } from './index';
import type { RunReport } from './types';

function buildReport(): RunReport {
  const results = [
    match({
      winnerSeat: 0,
      rounds: 12,
      turns: [turn({ seat: 0, hasArmyOffOwnBase: true }), turn({ seat: 1, hasArmyOffOwnBase: true })],
      finalState: [seatFinal({ victoryPoints: 30 }), seatFinal({ victoryPoints: 18 })],
    }),
  ];

  return {
    header: {
      seed: 1,
      gamesPerConfig: 1,
      maxRounds: 150,
      gitCommit: 'abc1234',
      settingsSnapshot: { fogOfWar: true },
      generatedAt: '2026-01-01T00:00:00.000Z',
    },
    configs: [computeConfigMetrics(results, 2, true, 30)],
  };
}

describe('toMarkdown', () => {
  it('includes the header, a "Read this first" section, and every config', () => {
    const markdown = toMarkdown(buildReport());

    expect(markdown).toContain('Seed 1');
    expect(markdown).toContain('commit abc1234');
    expect(markdown).toContain('## Read this first');
    expect(markdown).toContain('## 2 players, fog on');
    expect(markdown).toContain('M9 combat accuracy');
  });

  it('says so when no config triggers any flag', () => {
    expect(toMarkdown(buildReport())).toContain('No M1, M10 or integrity flags fired');
  });
});

describe('toJson', () => {
  it('round-trips the same numbers the Markdown reads from', () => {
    const report = buildReport();
    const parsed = JSON.parse(toJson(report));

    expect(parsed.header.seed).toBe(1);
    expect(parsed.configs[0].m1.totalMatches).toBe(1);
  });
});
