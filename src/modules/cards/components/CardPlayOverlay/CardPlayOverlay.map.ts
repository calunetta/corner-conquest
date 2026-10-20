import type { GameState } from '@/lib/types';
import type { CardPlay, LoggedCardPlay } from './CardPlayOverlay.types';

export const CARD_PLAY_DURATION_MS = 1100;
export const CARD_PLAY_REDUCED_DURATION_MS = 1000;

export function toPlayDurationMs(isReducedMotion: boolean): number {
  return isReducedMotion ? CARD_PLAY_REDUCED_DURATION_MS : CARD_PLAY_DURATION_MS;
}

export function toStatusText(play: CardPlay | null): string {
  return play ? `You played ${play.cardName}.` : '';
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
    plays.push({ cardName: entry.cardName, turn: entry.turn });
  }
  return plays;
}
