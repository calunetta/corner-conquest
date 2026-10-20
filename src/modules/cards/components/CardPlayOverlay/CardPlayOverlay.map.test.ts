import { CardName } from '@/lib/types';
import {
  CARD_PLAY_DURATION_MS,
  CARD_PLAY_REDUCED_DURATION_MS,
  toPlayDurationMs,
  toStatusText,
} from './CardPlayOverlay.map';

describe('toPlayDurationMs', () => {
  it.each([
    [false, 1100],
    [true, 1000],
  ])('isReducedMotion=%s gives %i ms', (isReducedMotion, expected) => {
    expect(toPlayDurationMs(isReducedMotion)).toBe(expected);
  });

  it('exports the duration constants', () => {
    expect(CARD_PLAY_DURATION_MS).toBe(1100);
    expect(CARD_PLAY_REDUCED_DURATION_MS).toBe(1000);
  });
});

describe('toStatusText', () => {
  it('returns an empty string without a play', () => {
    expect(toStatusText(null)).toBe('');
  });

  it.each([
    [CardName.WarChief, 'You played War Chief.'],
    [CardName.ExtraMove, 'You played Extra Move.'],
  ])('announces %s', (cardName, expected) => {
    expect(toStatusText({ cardName, playId: 1 })).toBe(expected);
  });

  it('does not mutate the play', () => {
    const play = { cardName: CardName.WarChief, playId: 3 };
    toStatusText(play);
    expect(play).toEqual({ cardName: CardName.WarChief, playId: 3 });
  });
});
