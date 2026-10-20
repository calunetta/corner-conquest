import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardName } from '@/lib/types';
import { useIsMobile } from '@/modules/shared';
import { toPlayDurationMs } from './CardPlayOverlay.map';
import type { CardPlay, CardPlayOverlayProps, CardPlayOverlayViewProps } from './CardPlayOverlay.types';

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
