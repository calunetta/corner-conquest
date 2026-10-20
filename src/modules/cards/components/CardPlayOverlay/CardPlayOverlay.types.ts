import type { CardName, GameState } from '@/lib/types';

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

/** A card-use log entry by the local player. */
export interface LoggedCardPlay {
  cardName: CardName;
  turn: number;
}

export interface CardPlayTriggerArgs {
  /** gameState.log (displayed state, local buffer on my turn). */
  log: GameState['log'];
  /** localPlayer.playerId */
  localPlayerId: string;
  /** True while any dialog, pending step or combat is open; a detected play is held until false. */
  isBlocked: boolean;
}
