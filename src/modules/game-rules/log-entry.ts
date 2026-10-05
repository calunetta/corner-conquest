import type { GameState, LogEntry, StructuredLogEntry } from '@/lib/types';

export type LogEntryInput = Omit<StructuredLogEntry, 'kind' | 'turn'>;

/** Mutates state.log in place — mirrors the `state.log.push(...)` convention it replaces. */
export function pushLogEntry(state: GameState, input: LogEntryInput): void {
  state.log.push({ kind: 'structured', turn: state.turn, ...input });
}

/** Extracts the display string from either union member. */
export function toLogMessage(entry: LogEntry): string {
  return typeof entry === 'string' ? entry : entry.message;
}
