import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, parseArgs } from './cli';

describe('parseArgs', () => {
  it('fills in defaults when no flags are given', () => {
    const options = parseArgs([]);
    expect(options).toEqual({ players: [2, 3, 4], fog: ['on', 'off'], games: 200, seed: 1, maxRounds: 150, out: 'balance-reports' });
  });

  it('parses comma-separated lists and numbers', () => {
    const options = parseArgs(['--players', '2,4', '--fog', 'on', '--games', '5', '--seed', '7', '--max-rounds', '20', '--out', 'x']);
    expect(options).toEqual({ players: [2, 4], fog: ['on'], games: 5, seed: 7, maxRounds: 20, out: 'x' });
  });

  it('rejects an unknown flag rather than silently ignoring it', () => {
    expect(() => parseArgs(['--bogus', '1'])).toThrow('Unknown flag: --bogus');
  });
});

describe('main (CLI entry)', () => {
  // Jest's CLI treats positional arguments (with or without a "--") as test-path filters, not as
  // passthrough argv for the test file — there is no reliable way to hand this file real CLI flags
  // through `jest`'s own argv. BALANCE_SIMULATOR_ARGS carries them instead:
  //   BALANCE_SIMULATOR_ARGS="--players 2,3,4 --games 200" npm run balance:simulate
  // With no env var set (the plain `npm test` case), this runs the tiny matrix the Final spec's
  // Acceptance #4 calls for, so the full test suite never accidentally triggers a multi-minute run.
  const passedArgs = process.env.BALANCE_SIMULATOR_ARGS?.split(/\s+/).filter(Boolean) ?? [];
  const isRealRun = passedArgs.length > 0;

  jest.setTimeout(isRealRun ? 30 * 60 * 1000 : 30 * 1000);

  it(isRealRun ? 'runs the requested balance matrix' : 'runs a tiny matrix and writes both report files (Acceptance #4)', async () => {
    const outDir = isRealRun
      ? (passedArgs[passedArgs.indexOf('--out') + 1] ?? 'balance-reports')
      : mkdtempSync(join(tmpdir(), 'balance-sim-'));
    const args = isRealRun ? passedArgs : ['--players', '2', '--fog', 'on', '--games', '3', '--seed', '1', '--max-rounds', '20', '--out', outDir];

    await main(args);

    expect(existsSync(join(outDir, 'report.md'))).toBe(true);
    expect(existsSync(join(outDir, 'report.json'))).toBe(true);
    const json = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8'));
    expect(json.configs.length).toBeGreaterThan(0);

    if (!isRealRun) rmSync(outDir, { recursive: true, force: true });
  });

  it('is deterministic: two tiny runs with the same seed produce byte-identical JSON apart from the timestamp', async () => {
    const outA = mkdtempSync(join(tmpdir(), 'balance-sim-a-'));
    const outB = mkdtempSync(join(tmpdir(), 'balance-sim-b-'));
    const args = (out: string) => ['--players', '2', '--fog', 'on', '--games', '2', '--seed', '42', '--max-rounds', '15', '--out', out];

    await main(args(outA));
    await main(args(outB));

    const strip = (text: string) => text.replace(/"generatedAt":\s*"[^"]*"/, '"generatedAt":"STRIPPED"');
    const jsonA = strip(readFileSync(join(outA, 'report.json'), 'utf8'));
    const jsonB = strip(readFileSync(join(outB, 'report.json'), 'utf8'));

    expect(jsonA).toBe(jsonB);

    rmSync(outA, { recursive: true, force: true });
    rmSync(outB, { recursive: true, force: true });
  });
});
