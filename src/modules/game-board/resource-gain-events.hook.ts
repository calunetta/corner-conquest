import { useEffect, useMemo, useRef } from 'react';
import type { GameState } from '@/lib/types';
import { findNewResourceGainEvents } from './resource-gain-events.map';
import type { ResourceGainEvent } from './resource-gain-events.types';

/** Returns the resource-gain events added to `gameState.log` since this hook instance last saw
 *  it. The first render seeds the seen length without returning events, so a page reload
 *  mid-match never replays history. The seen length is committed in an effect, not during render,
 *  so StrictMode's double render computes the same batch twice instead of losing it. */
export function useResourceGainEvents(gameState: GameState | null): ResourceGainEvent[] {
  const log = gameState?.log;
  const seenLogLength = useRef<number | null>(null);

  const newEvents = useMemo<ResourceGainEvent[]>(() => {
    if (!log) return [];
    const sinceIndex = seenLogLength.current ?? log.length;
    return findNewResourceGainEvents(log, sinceIndex);
  }, [log]);

  useEffect(() => {
    if (log) seenLogLength.current = log.length;
  }, [log]);

  return newEvents;
}
