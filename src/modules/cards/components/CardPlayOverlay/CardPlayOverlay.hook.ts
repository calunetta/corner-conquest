import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardName } from '@/lib/types';
import { useIsMobile } from '@/modules/shared';
import { preloadCardArt } from '../../card-preload';
import { findNewCardPlays, toPlayDurationMs } from './CardPlayOverlay.map';
import type {
  CardPlay,
  CardPlayOverlayProps,
  CardPlayOverlayViewProps,
  CardPlayTriggerArgs,
  QueuedPlay,
} from './CardPlayOverlay.types';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Local-only state owner. startPlay replaces any current play (new playId). */
export function useCardPlay(): {
  play: CardPlay | null;
  startPlay: (cardName: CardName, isFound?: true) => void;
  endPlay: () => void;
} {
  const [play, setPlay] = useState<CardPlay | null>(null);
  const lastPlayId = useRef(0);

  const startPlay = useCallback((cardName: CardName, isFound?: true) => {
    lastPlayId.current += 1;
    setPlay({ cardName, playId: lastPlayId.current, ...(isFound && { isFound }) });
  }, []);

  const endPlay = useCallback(() => setPlay(null), []);

  return { play, startPlay, endPlay };
}

/**
 * Seeds on first run (never replays history). Queues new local card-use log entries, deduped by
 * turn and card name, and starts one when nothing is blocking and no play is active.
 * A Teleport/Scout `selectionPlay` is queued once on selection under the same key, so its later log entry is skipped.
 * A `foundCard` is queued each time it becomes a card, outside that key, so finding then using a card plays twice.
 */
export function useCardPlayTrigger({
  log,
  localPlayerId,
  isBlocked,
  selectionPlay,
  foundCard,
}: CardPlayTriggerArgs): {
  play: CardPlay | null;
  endPlay: () => void;
} {
  const { play, startPlay, endPlay } = useCardPlay();
  const [queue, setQueue] = useState<QueuedPlay[]>([]);
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
    if (fresh.length > 0) setQueue((current) => [...current, ...fresh.map(({ cardName }) => ({ cardName }))]);
  }, [log, localPlayerId]);

  const selectionCard = selectionPlay?.cardName ?? null;
  const selectionTurn = selectionPlay?.turn ?? null;
  useEffect(() => {
    if (selectionCard === null || selectionTurn === null) return;
    const key = `${selectionTurn}:${selectionCard}`;
    if (queuedKeys.current.has(key)) return;
    queuedKeys.current.add(key);
    setQueue((current) => [...current, { cardName: selectionCard }]);
  }, [selectionCard, selectionTurn]);

  useEffect(() => {
    if (!foundCard) return;
    setQueue((current) => [...current, { cardName: foundCard, isFound: true }]);
  }, [foundCard]);

  useEffect(() => {
    if (isBlocked || play || queue.length === 0) return;
    const next = queue[0];
    let isCancelled = false;
    void preloadCardArt(next.cardName).then(() => {
      if (isCancelled) return;
      startPlay(next.cardName, next.isFound);
      setQueue((current) => current.slice(1));
    });
    return () => {
      isCancelled = true;
    };
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
