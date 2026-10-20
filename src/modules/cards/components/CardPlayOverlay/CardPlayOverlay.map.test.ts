import { CardName } from '@/lib/types';
import type { GameState, StructuredLogEntry } from '@/lib/types';
import {
  CARD_PLAY_DURATION_MS,
  CARD_PLAY_REDUCED_DURATION_MS,
  findNewCardPlays,
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

function entry(overrides: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
  return { kind: 'structured', turn: 1, category: 'cards', message: 'used a card', ...overrides };
}

describe('findNewCardPlays', () => {
  const localId = '1';

  it('returns [] for an empty log', () => {
    expect(findNewCardPlays([], 0, localId)).toEqual([]);
  });

  it.each([
    [1, 'sinceIndex equals log length'],
    [5, 'sinceIndex beyond log length'],
  ])('returns [] when %i (%s)', (sinceIndex) => {
    const log = [entry({ playerId: localId, cardName: CardName.WarChief })];
    expect(findNewCardPlays(log, sinceIndex, localId)).toEqual([]);
  });

  it('skips string entries', () => {
    expect(findNewCardPlays(['Player 1 used War Chief'], 0, localId)).toEqual([]);
  });

  it('skips entries without cardName', () => {
    expect(findNewCardPlays([entry({ playerId: localId })], 0, localId)).toEqual([]);
  });

  it('skips entries by another player', () => {
    const log = [entry({ playerId: '2', cardName: CardName.WarChief })];
    expect(findNewCardPlays(log, 0, localId)).toEqual([]);
  });

  it('skips entries without playerId', () => {
    expect(findNewCardPlays([entry({ cardName: CardName.WarChief })], 0, localId)).toEqual([]);
  });

  it('returns cardName and turn in log order for local entries', () => {
    const log = [
      entry({ playerId: localId, cardName: CardName.WarChief, turn: 3 }),
      entry({ playerId: '2', cardName: CardName.Efficient, turn: 3 }),
      'text',
      entry({ playerId: localId, cardName: CardName.ExtraMove, turn: 4 }),
    ];
    expect(findNewCardPlays(log, 0, localId)).toEqual([
      { cardName: CardName.WarChief, turn: 3 },
      { cardName: CardName.ExtraMove, turn: 4 },
    ]);
  });

  it('ignores matching entries before sinceIndex', () => {
    const log = [
      entry({ playerId: localId, cardName: CardName.WarChief, turn: 1 }),
      entry({ playerId: localId, cardName: CardName.ExtraMove, turn: 2 }),
    ];
    expect(findNewCardPlays(log, 1, localId)).toEqual([{ cardName: CardName.ExtraMove, turn: 2 }]);
  });

  it('does not mutate the log', () => {
    const log: GameState['log'] = [entry({ playerId: localId, cardName: CardName.WarChief })];
    const copy = JSON.parse(JSON.stringify(log));
    findNewCardPlays(log, 0, localId);
    expect(log).toEqual(copy);
  });
});
