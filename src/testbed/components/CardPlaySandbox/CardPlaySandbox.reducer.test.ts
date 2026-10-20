import { CardName } from '@/lib/types';
import { SANDBOX_INITIAL_GAME, SANDBOX_LOCAL_PLAYER_ID, SANDBOX_STARTING_HAND } from './CardPlaySandbox.fixtures';
import { sandboxGameReducer } from './CardPlaySandbox.reducer';
import type { SandboxGame } from './CardPlaySandbox.types';

const game = (over: Partial<SandboxGame> = {}): SandboxGame => ({ ...SANDBOX_INITIAL_GAME, ...over });

describe('sandboxGameReducer use-card', () => {
  it('removes the card, flags the use and appends a log entry with the turn', () => {
    const next = sandboxGameReducer(game({ turn: 3 }), { type: 'use-card', cardName: CardName.Teleport });
    expect(next.cards).toEqual(SANDBOX_STARTING_HAND.filter((card) => card !== CardName.Teleport));
    expect(next.hasUsedCard).toBe(true);
    expect(next.turn).toBe(3);
    expect(next.log).toEqual([
      expect.objectContaining({
        kind: 'structured',
        turn: 3,
        cardName: CardName.Teleport,
        playerId: SANDBOX_LOCAL_PLAYER_ID,
      }),
    ]);
  });

  it('removes exactly one copy of a duplicated card', () => {
    const cards = [CardName.Scout, CardName.Reinforce, CardName.Scout];
    const next = sandboxGameReducer(game({ cards }), { type: 'use-card', cardName: CardName.Scout });
    expect(next.cards).toEqual([CardName.Reinforce, CardName.Scout]);
  });

  it('keeps the hand when the card is not in it, but still logs and flags', () => {
    const next = sandboxGameReducer(game({ cards: [CardName.Reinforce] }), {
      type: 'use-card',
      cardName: CardName.Scout,
    });
    expect(next.cards).toEqual([CardName.Reinforce]);
    expect(next.log).toHaveLength(1);
    expect(next.hasUsedCard).toBe(true);
  });

  it('does not mutate the input', () => {
    const input = game();
    const before = JSON.parse(JSON.stringify(input));
    sandboxGameReducer(input, { type: 'use-card', cardName: CardName.Scout });
    expect(input).toEqual(before);
  });
});

describe('sandboxGameReducer log-combat-card', () => {
  it('appends an entry and leaves hand and hasUsedCard unchanged', () => {
    const input = game({ turn: 2 });
    const next = sandboxGameReducer(input, { type: 'log-combat-card', cardName: CardName.Overcome });
    expect(next.cards).toBe(input.cards);
    expect(next.hasUsedCard).toBe(false);
    expect(next.log).toEqual([expect.objectContaining({ turn: 2, cardName: CardName.Overcome })]);
  });

  it('does not mutate the input log', () => {
    const input = game();
    sandboxGameReducer(input, { type: 'log-combat-card', cardName: CardName.WarChief });
    expect(input.log).toEqual([]);
  });
});

describe('sandboxGameReducer next-turn', () => {
  it('increments the turn, restores the hand, clears hasUsedCard and keeps the log', () => {
    const used = sandboxGameReducer(game(), { type: 'use-card', cardName: CardName.Scout });
    const next = sandboxGameReducer(used, { type: 'next-turn' });
    expect(next.turn).toBe(2);
    expect(next.cards).toEqual(SANDBOX_STARTING_HAND);
    expect(next.hasUsedCard).toBe(false);
    expect(next.log).toEqual(used.log);
  });

  it('does not mutate the input', () => {
    const input = game({ hasUsedCard: true, turn: 5 });
    sandboxGameReducer(input, { type: 'next-turn' });
    expect(input.turn).toBe(5);
    expect(input.hasUsedCard).toBe(true);
  });
});
