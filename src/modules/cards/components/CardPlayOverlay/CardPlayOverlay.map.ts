import type { CardPlay } from './CardPlayOverlay.types';

export const CARD_PLAY_DURATION_MS = 1100;
export const CARD_PLAY_REDUCED_DURATION_MS = 1000;

export function toPlayDurationMs(isReducedMotion: boolean): number {
  return isReducedMotion ? CARD_PLAY_REDUCED_DURATION_MS : CARD_PLAY_DURATION_MS;
}

export function toStatusText(play: CardPlay | null): string {
  return play ? `You played ${play.cardName}.` : '';
}
