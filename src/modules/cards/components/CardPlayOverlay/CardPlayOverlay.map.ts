import { CardName } from '@/lib/types';
import type { GameState } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import type { CardPlay, LoggedCardPlay, SelectionPlay } from './CardPlayOverlay.types';

export const CARD_PLAY_DURATION_MS = 1100;
export const CARD_PLAY_REDUCED_DURATION_MS = 1000;

/** Combat cards never play the animation. */
export const NO_PLAY_CARDS: readonly CardName[] = [CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll];

export function toPlayDurationMs(isReducedMotion: boolean): number {
  return isReducedMotion ? CARD_PLAY_REDUCED_DURATION_MS : CARD_PLAY_DURATION_MS;
}

export function toStatusText(play: CardPlay | null): string {
  if (!play) return '';
  return play.isFound ? `You found ${play.cardName}.` : `You played ${play.cardName}.`;
}

/** Local player's card-use entries in `log.slice(sinceIndex)`, in log order. */
export function findNewCardPlays(
  log: GameState['log'],
  sinceIndex: number,
  localPlayerId: string,
): LoggedCardPlay[] {
  const plays: LoggedCardPlay[] = [];
  for (const entry of log.slice(sinceIndex)) {
    if (typeof entry === 'string') continue;
    if (!entry.cardName || entry.playerId !== localPlayerId) continue;
    if (NO_PLAY_CARDS.includes(entry.cardName)) continue;
    plays.push({ cardName: entry.cardName, turn: entry.turn });
  }
  return plays;
}

/** Pending-action types whose card plays on selection, while the map targeting is still pending. */
const SELECTION_PLAY_PENDING_TYPES: readonly string[] = ['teleport', 'scout'];

export function toSelectionPlay(pendingAction: PendingAction, turn: number): SelectionPlay | null {
  if (!pendingAction || !SELECTION_PLAY_PENDING_TYPES.includes(pendingAction.type)) return null;
  return { cardName: pendingAction.cardName, turn };
}
