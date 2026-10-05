import type { LogEntry } from '@/lib/types';

export function toGameLogEntries(logs: LogEntry[]): LogEntry[] {
  return [...logs].reverse();
}
