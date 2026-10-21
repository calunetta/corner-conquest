import type { CardName } from '@/lib/types';
import { CARD_ART } from './card-art';

/** Longest wait for a card image before the play starts anyway. */
export const CARD_PRELOAD_TIMEOUT_MS = 1500;

/**
 * Resolves when CARD_ART[cardName].card is loaded and decoded, fails to load, or
 * `timeoutMs` has passed. Never rejects. Uses window.Image; calls image.decode()
 * when it exists, else waits for onload. Clears its timer on settle.
 */
export function preloadCardArt(
  cardName: CardName,
  timeoutMs: number = CARD_PRELOAD_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const settle = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const image = new window.Image();
    image.onerror = settle;
    if (typeof image.decode === 'function') {
      image.src = CARD_ART[cardName].card;
      image.decode().then(settle, settle);
      return;
    }
    image.onload = settle;
    image.src = CARD_ART[cardName].card;
  });
}
