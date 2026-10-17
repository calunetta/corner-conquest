import type { CardName, GameState } from '@/lib/types';
import { HAND_LIMIT } from '@/lib/types';

/**
 * Picks the card a special-island roll would draw, or null when no card can be drawn.
 * The UI calls this once and sends the result in the action payload, so the local reducer and
 * the replay that is saved to Firestore apply the same card (a random draw in each would diverge).
 */
export function chooseSpecialIslandCard(state: GameState): CardName | null {
  const player = state.players[state.currentPlayerIndex];
  if (player.specialCards.length >= HAND_LIMIT && !state.debugMode) return null;

  const pool = state.specialCardsDeck.length > 0 ? state.specialCardsDeck : state.discardPile;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Removes `preferred` from the deck when it is there; otherwise draws a random card, as before. */
export function takeCardFromDeck(deck: CardName[], preferred?: CardName): CardName {
  const preferredIndex = preferred ? deck.indexOf(preferred) : -1;
  const index = preferredIndex >= 0 ? preferredIndex : Math.floor(Math.random() * deck.length);
  return deck.splice(index, 1)[0];
}
