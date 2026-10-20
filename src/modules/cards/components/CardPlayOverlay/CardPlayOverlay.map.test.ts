import { CardName } from '@/lib/types';
import type { GameState, StructuredLogEntry } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import {
  CARD_PLAY_DURATION_MS,
  CARD_PLAY_REDUCED_DURATION_MS,
  NO_PLAY_CARDS,
  findNewCardPlays,
  toSelectionPlay,
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

  it.each([
    [CardName.ExtraMove, 'You found Extra Move.'],
    [CardName.WarChief, 'You found War Chief.'],
    [CardName.Overcome, 'You found Overcome.'],
  ])('announces a found %s', (cardName, expected) => {
    expect(toStatusText({ cardName, playId: 1, isFound: true })).toBe(expected);
  });

  it('does not mutate a found play', () => {
    const play = { cardName: CardName.WarChief, playId: 3, isFound: true as const };
    toStatusText(play);
    expect(play).toEqual({ cardName: CardName.WarChief, playId: 3, isFound: true });
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
    const log = [entry({ playerId: localId, cardName: CardName.Reinforce })];
    expect(findNewCardPlays(log, sinceIndex, localId)).toEqual([]);
  });

  it('skips string entries', () => {
    expect(findNewCardPlays(['Player 1 used Reinforce'], 0, localId)).toEqual([]);
  });

  it('skips entries without cardName', () => {
    expect(findNewCardPlays([entry({ playerId: localId })], 0, localId)).toEqual([]);
  });

  it('skips entries by another player', () => {
    const log = [entry({ playerId: '2', cardName: CardName.Reinforce })];
    expect(findNewCardPlays(log, 0, localId)).toEqual([]);
  });

  it('skips entries without playerId', () => {
    expect(findNewCardPlays([entry({ cardName: CardName.Reinforce })], 0, localId)).toEqual([]);
  });

  it('returns cardName and turn in log order for local entries', () => {
    const log = [
      entry({ playerId: localId, cardName: CardName.Reinforce, turn: 3 }),
      entry({ playerId: '2', cardName: CardName.Efficient, turn: 3 }),
      'text',
      entry({ playerId: localId, cardName: CardName.ExtraMove, turn: 4 }),
    ];
    expect(findNewCardPlays(log, 0, localId)).toEqual([
      { cardName: CardName.Reinforce, turn: 3 },
      { cardName: CardName.ExtraMove, turn: 4 },
    ]);
  });

  it('ignores matching entries before sinceIndex', () => {
    const log = [
      entry({ playerId: localId, cardName: CardName.Reinforce, turn: 1 }),
      entry({ playerId: localId, cardName: CardName.ExtraMove, turn: 2 }),
    ];
    expect(findNewCardPlays(log, 1, localId)).toEqual([{ cardName: CardName.ExtraMove, turn: 2 }]);
  });

  it('does not mutate the log', () => {
    const log: GameState['log'] = [entry({ playerId: localId, cardName: CardName.Reinforce })];
    const copy = JSON.parse(JSON.stringify(log));
    findNewCardPlays(log, 0, localId);
    expect(log).toEqual(copy);
  });

  it.each([CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll])(
    'skips the combat card %s by the local player',
    (cardName) => {
      expect(findNewCardPlays([entry({ playerId: localId, cardName })], 0, localId)).toEqual([]);
    },
  );

  it.each([CardName.Teleport, CardName.ExtraMove])('still returns %s', (cardName) => {
    expect(findNewCardPlays([entry({ playerId: localId, cardName, turn: 2 })], 0, localId)).toEqual([
      { cardName, turn: 2 },
    ]);
  });

  it('drops combat cards between other plays and keeps the rest in order', () => {
    const log = [
      entry({ playerId: localId, cardName: CardName.Overcome, turn: 1 }),
      entry({ playerId: localId, cardName: CardName.ExtraMove, turn: 1 }),
      entry({ playerId: localId, cardName: CardName.DecideDiceRoll, turn: 1 }),
      entry({ playerId: localId, cardName: CardName.Teleport, turn: 1 }),
    ];
    expect(findNewCardPlays(log, 0, localId)).toEqual([
      { cardName: CardName.ExtraMove, turn: 1 },
      { cardName: CardName.Teleport, turn: 1 },
    ]);
  });
});

describe('NO_PLAY_CARDS', () => {
  it('lists exactly the three combat cards', () => {
    expect([...NO_PLAY_CARDS]).toEqual([CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll]);
  });
});

describe('toSelectionPlay', () => {
  it('returns the Teleport card and turn for a pending teleport', () => {
    expect(toSelectionPlay({ type: 'teleport', cardName: CardName.Teleport }, 3)).toEqual({
      cardName: 'Teleport',
      turn: 3,
    });
  });

  it('returns the Scout card and turn for a pending scout', () => {
    const pending: PendingAction = { type: 'scout', cardName: CardName.Scout, count: 3, scoutedTiles: [] };
    expect(toSelectionPlay(pending, 5)).toEqual({ cardName: 'Scout', turn: 5 });
  });

  it('returns null for a pending extra-move', () => {
    expect(toSelectionPlay({ type: 'extra-move', cardName: CardName.ExtraMove }, 3)).toBeNull();
  });

  it('returns null for no pending action', () => {
    expect(toSelectionPlay(null, 3)).toBeNull();
  });

  it('returns null for a runtime-only sabotage pending action', () => {
    const pending = { type: 'sabotage', cardName: CardName.Sabotage } as unknown as PendingAction;
    expect(toSelectionPlay(pending, 3)).toBeNull();
  });

  it('does not mutate the pending action', () => {
    const pending: PendingAction = { type: 'teleport', cardName: CardName.Teleport };
    toSelectionPlay(pending, 3);
    expect(pending).toEqual({ type: 'teleport', cardName: CardName.Teleport });
  });
});
