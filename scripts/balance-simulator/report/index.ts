import type { RunReport } from './types';

export { collectFlags, type Flag } from './flags';
export { toMarkdown } from './markdown';
export type { RunHeader, RunReport } from './types';

/** Stable, readable JSON: the same numbers the Markdown tables show. */
export function toJson(report: RunReport): string {
  return JSON.stringify(report, null, 2);
}
