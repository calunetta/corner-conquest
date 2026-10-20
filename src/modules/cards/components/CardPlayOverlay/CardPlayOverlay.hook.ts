import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardName } from '@/lib/types';
import { useIsMobile } from '@/modules/shared';
import { findNewCardPlays, toPlayDurationMs } from './CardPlayOverlay.map';
import type {
  CardPlay,
  CardPlayOverlayProps,
  CardPlayOverlayViewProps,
  CardPlayTriggerArgs,
} from './CardPlayOverlay.types';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Local-only state owner. startPlay replaces any current play (new playId). */
export function useCardPlay(): {
  play: CardPlay | null;
  startPlay: (cardName: CardName) => void;
  endPlay: () => void;
} {
  const [play, setPlay] = useState<CardPlay | null>(null);
  const lastPlayId = useRef(0);

  const startPlay = useCallback((cardName: CardName) => {
    lastPlayId.current += 1;
    setPlay({ cardName, playId: lastPlayId.current });
  }, []);

  const endPlay = useCallback(() => setPlay(null), []);

  return { play, startPlay, endPlay };
}

/**
 * Seeds on first run (never replays history). Queues new local card-use log entries, deduped by
 * turn and card name, and starts one when nothing is blocking and no play is active.
 */
export function useCardPlayTrigger({ log, localPlayerId, isBlocked }: CardPlayTriggerArgs): {
  play: CardPlay | null;
  endPlay: () => void;
} {
  const { play, startPlay, endPlay } = useCardPlay();
  const [queue, setQueue] = useState<CardName[]>([]);
  const seenLogLength = useRef<number | null>(null);
  const queuedKeys = useRef(new Set<string>());

  useEffect(() => {
    const seen = seenLogLength.current;
    seenLogLength.current = log.length;
    const isSeeding = seen === null;
    if (!isSeeding && log.length <= seen) return;
    const fresh = findNewCardPlays(log, seen ?? 0, localPlayerId).filter(({ turn, cardName }) => {
      const key = `${turn}:${cardName}`;
      if (queuedKeys.current.has(key)) return false;
      queuedKeys.current.add(key);
      return !isSeeding;
    });
    if (fresh.length > 0) setQueue((current) => [...current, ...fresh.map((entry) => entry.cardName)]);
  }, [log, localPlayerId]);

  useEffect(() => {
    if (isBlocked || play || queue.length === 0) return;
    startPlay(queue[0]);
    setQueue((current) => current.slice(1));
  }, [queue, isBlocked, play, startPlay]);

  return { play, endPlay };
}

function useIsReducedMotion(): boolean {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!query) return;
    setIsReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setIsReducedMotion(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isReducedMotion;
}

export function useCardPlayOverlay({ play, onFinished }: CardPlayOverlayProps): CardPlayOverlayViewProps {
  const isMobile = useIsMobile();
  const isReducedMotion = useIsReducedMotion();
  const playId = play?.playId;

  useEffect(() => {
    if (playId === undefined) return;
    const timer = setTimeout(onFinished, toPlayDurationMs(isReducedMotion));
    return () => clearTimeout(timer);
  }, [playId, isReducedMotion, onFinished]);

  return { play, isMobile, isReducedMotion };
}
