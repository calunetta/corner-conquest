import { CardName } from '../../../src/lib/types/cards';
import { computeM8 } from './cards';
import { events, match, seatFinal, turn } from './test-fixtures';

describe('computeM8', () => {
  it('tallies acquired, consumed and held per card kind', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, events: events({ kind: 'cardBought', cardName: CardName.Scout }) }),
          turn({ seat: 0, events: events({ kind: 'cardConsumed', cardName: CardName.ExtraMove }) }),
        ],
        finalState: [seatFinal({ heldCards: [CardName.Scout, CardName.Wealthy] })],
      }),
    ];

    const m8 = computeM8(results);

    expect(m8.byCard[CardName.Scout]).toEqual({ acquired: 1, consumed: 0, held: 1 });
    expect(m8.byCard[CardName.ExtraMove]).toEqual({ acquired: 0, consumed: 1, held: 0 });
    // Wealthy was held at game end without ever being logged as acquired by this fixture — exactly
    // the shape the integrity check below is meant to catch.
  });

  it('integrity: zero mismatches when every acquired card is accounted for by consumed + held', () => {
    const results = [
      match({
        turns: [turn({ seat: 0, events: events({ kind: 'cardBought', cardName: CardName.Scout }) })],
        finalState: [seatFinal({ heldCards: [CardName.Scout] })],
      }),
    ];

    expect(computeM8(results).mismatchCount).toBe(0);
  });

  it('integrity: flags a mismatch when a held card was never recorded as acquired', () => {
    const results = [
      match({ turns: [], finalState: [seatFinal({ heldCards: [CardName.Wealthy] })] }),
    ];

    expect(computeM8(results).mismatchCount).toBe(1);
  });

  it('counts draws lost to a full hand and the percentage of seats ending at 7+ cards', () => {
    const sevenCards = new Array(7).fill(CardName.Scout);
    const results = [
      match({
        turns: [turn({ seat: 0, events: events({ kind: 'drawLostToFullHand' }) })],
        finalState: [seatFinal({ heldCards: sevenCards }), seatFinal({ heldCards: [] })],
      }),
    ];

    const m8 = computeM8(results);
    expect(m8.drawsLostToFullHand).toBe(1);
    expect(m8.pctSeatsAtSevenCards).toBe(50);
  });
});
