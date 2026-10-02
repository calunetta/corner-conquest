import { CardName } from '../../../src/lib/types/cards';
import { computeM10 } from './bot-health';
import { events, match, seatFinal, turn } from './test-fixtures';

describe('computeM10', () => {
  it('records the first round a seat leaves its own base, and flags a seat that never leaves', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, round: 1, hasArmyOffOwnBase: false }),
          turn({ seat: 0, round: 2, hasArmyOffOwnBase: true }),
          turn({ seat: 1, round: 1, hasArmyOffOwnBase: false }),
        ],
        finalState: [seatFinal(), seatFinal()],
      }),
    ];

    const m10 = computeM10(results, 2);

    expect(m10.bySeat[0].firstRoundOffOwnBase).toBe(2);
    expect(m10.bySeat[0].neverLeftBase).toBe(false);
    expect(m10.bySeat[1].firstRoundOffOwnBase).toBeNull();
    expect(m10.bySeat[1].neverLeftBase).toBe(true);
    expect(m10.neverLeftBasePct).toBe(50);
  });

  it('computes the share of a seat\'s held positions that sit on its own base', () => {
    const results = [
      match({
        turns: [turn({ seat: 0, heldPositions: 4, heldPositionsOnOwnBase: 1 })],
        finalState: [seatFinal()],
      }),
    ];

    expect(computeM10(results, 1).bySeat[0].pctPositionsOnOwnBase).toBe(25);
  });

  it('flags a seat as trapped when it ends a match holding Productive and a resource position', () => {
    const results = [
      match({ turns: [], finalState: [seatFinal({ hasProductiveInHand: true, hasHeldPositions: true })] }),
    ];

    const m10 = computeM10(results, 1);
    expect(m10.bySeat[0].trappedWithProductive).toBe(true);
    expect(m10.trappedPct).toBe(100);
  });

  it('lists cards a seat acquired at least once but never consumed, excluding human-only cards', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, events: events({ kind: 'cardBought', cardName: CardName.Sabotage }) }),
          turn({ seat: 0, events: events({ kind: 'cardBought', cardName: CardName.Teleport }) }),
          turn({ seat: 0, events: events({ kind: 'cardConsumed', cardName: CardName.Teleport }) }),
        ],
        finalState: [seatFinal()],
      }),
    ];

    const unused = computeM10(results, 1).bySeat[0].everUnusedCards;
    expect(unused).not.toContain(CardName.Sabotage); // human-only: never fired for bots by design, not a finding
    expect(unused).not.toContain(CardName.Teleport); // acquired and consumed
  });
});
