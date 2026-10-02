import type { ConfigMetrics } from '../metrics/index';

export interface RunHeader {
  seed: number;
  gamesPerConfig: number;
  maxRounds: number;
  gitCommit: string;
  /** Only the settings this run actually varies or that affect balance; see cli.ts. */
  settingsSnapshot: Record<string, unknown>;
  /** ISO timestamp. Per the Final spec, this and gitCommit are the only fields allowed to differ
   *  between two "identical" runs (Acceptance #1). */
  generatedAt: string;
}

export interface RunReport {
  header: RunHeader;
  configs: ConfigMetrics[];
}
