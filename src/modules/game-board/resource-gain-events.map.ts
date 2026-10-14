import type { GameState, StructuredLogEntry } from '@/lib/types';
import type { ResourceGainEvent } from './resource-gain-events.types';

function isGainLogEntry(
  entry: GameState['log'][number],
): entry is StructuredLogEntry & { resourceGain: NonNullable<StructuredLogEntry['resourceGain']>; playerId: string } {
  return typeof entry !== 'string' && entry.resourceGain !== undefined && entry.playerId !== undefined;
}

/** Flattens every `resourceGain` entry on structured log entries added since `sinceIndex` into
 *  one event per (log entry, resource type). Not player-scoped: callers filter by `playerId`
 *  or `tileIds` themselves. */
export function findNewResourceGainEvents(log: GameState['log'], sinceIndex: number): ResourceGainEvent[] {
  return log
    .slice(sinceIndex)
    .filter(isGainLogEntry)
    .flatMap((entry) =>
      entry.resourceGain.map((gain) => ({
        playerId: entry.playerId,
        type: gain.type,
        tileIds: gain.tileIds ?? [],
      })),
    );
}
