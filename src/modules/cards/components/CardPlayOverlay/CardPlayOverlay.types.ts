import type { CardName } from '@/lib/types';

export interface CardPlay {
  cardName: CardName;
  /** Increments on every start; React key and timer dependency. */
  playId: number;
}

export interface CardPlayOverlayProps {
  play: CardPlay | null;
  /** Called once, after the animation duration, unless `play` changes first. */
  onFinished: () => void;
}

export interface CardPlayOverlayViewProps {
  play: CardPlay | null;
  isMobile: boolean;
  isReducedMotion: boolean;
}
