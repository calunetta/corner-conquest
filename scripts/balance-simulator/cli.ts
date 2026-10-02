import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultGameSettings } from '../../src/lib/game-initializer';
import { deriveMatchSeeds, runMatch, type MatchResult } from './engine';
import { computeConfigMetrics, type ConfigMetrics } from './metrics/index';
import { toJson, toMarkdown, type RunReport } from './report/index';

export interface CliOptions {
  players: number[];
  fog: Array<'on' | 'off'>;
  games: number;
  seed: number;
  maxRounds: number;
  out: string;
}

const DEFAULTS: CliOptions = { players: [2, 3, 4], fog: ['on', 'off'], games: 200, seed: 1, maxRounds: 150, out: 'balance-reports' };

/** Parses `--players 2,3,4 --fog on,off --games 200 --seed 1 --max-rounds 150 --out <dir>`. */
export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--players') options.players = value.split(',').map(Number);
    else if (flag === '--fog') options.fog = value.split(',') as Array<'on' | 'off'>;
    else if (flag === '--games') options.games = Number(value);
    else if (flag === '--seed') options.seed = Number(value);
    else if (flag === '--max-rounds') options.maxRounds = Number(value);
    else if (flag === '--out') options.out = value;
    else throw new Error(`Unknown flag: ${flag}`);
  }
  return options;
}

function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

/** Runs every (players, fog) combination in `options` and returns the full report, without
 *  writing anything to disk — kept separate from `main` so a test can call it with tiny numbers. */
export async function runAll(options: CliOptions): Promise<RunReport> {
  const configs: ConfigMetrics[] = [];

  for (const players of options.players) {
    for (const fogLabel of options.fog) {
      const fog = fogLabel === 'on';
      const results: MatchResult[] = [];
      for (let i = 0; i < options.games; i += 1) {
        const seeds = deriveMatchSeeds(options.seed, players, fog, i);
        results.push(await runMatch({ players, fog, maxRounds: options.maxRounds, ...seeds }));
      }
      configs.push(computeConfigMetrics(results, players, fog, defaultGameSettings.victoryPointGoal));
    }
  }

  return {
    header: {
      seed: options.seed,
      gamesPerConfig: options.games,
      maxRounds: options.maxRounds,
      gitCommit: gitCommit(),
      settingsSnapshot: { fogOfWarVaried: true, victoryPointGoal: defaultGameSettings.victoryPointGoal },
      generatedAt: new Date().toISOString(),
    },
    configs,
  };
}

export async function main(argv: string[]): Promise<void> {
  const options = parseArgs(argv);
  const report = await runAll(options);

  mkdirSync(options.out, { recursive: true });
  writeFileSync(join(options.out, 'report.json'), toJson(report));
  const markdown = toMarkdown(report);
  writeFileSync(join(options.out, 'report.md'), markdown);
  // eslint-disable-next-line no-console -- this is the CLI's own output, not app logging
  console.log(markdown);
}
