import { CardName } from '../../../src/lib/types/cards';
import type { MatchResult } from '../engine';

const ALL_CARD_NAMES = Object.values(CardName);

// --- M8: card economy, with an integrity check --------------------------------------------------

export interface CardMetrics {
  byCard: Record<CardName, { acquired: number; consumed: number; held: number }>;
  drawsLostToFullHand: number;
  pctSeatsAtSevenCards: number;
  /** Count of cards where acquired != consumed + held, across the whole run. Must be 0. */
  mismatchCount: number;
}

export function computeM8(results: MatchResult[]): CardMetrics {
  const byCard = Object.fromEntries(
    ALL_CARD_NAMES.map((name) => [name, { acquired: 0, consumed: 0, held: 0 }]),
  ) as Record<CardName, { acquired: number; consumed: number; held: number }>;

  let drawsLostToFullHand = 0;
  let seatsAtSeven = 0;
  let seatCount = 0;

  results.forEach((result) => {
    result.turns.forEach((turn) => {
      turn.events.forEach((event) => {
        if (event.kind === 'cardBought' || event.kind === 'specialIslandCardFound') {
          byCard[event.cardName].acquired += 1;
        } else if (event.kind === 'cardConsumed') {
          byCard[event.cardName].consumed += 1;
        } else if (event.kind === 'drawLostToFullHand') {
          drawsLostToFullHand += 1;
        }
      });
    });
    result.finalState.forEach((seat) => {
      seatCount += 1;
      if (seat.heldCards.length >= 7) seatsAtSeven += 1;
      seat.heldCards.forEach((cardName) => {
        byCard[cardName as CardName].held += 1;
      });
    });
  });

  const mismatchCount = ALL_CARD_NAMES.filter(
    (name) => byCard[name].acquired !== byCard[name].consumed + byCard[name].held,
  ).length;

  return {
    byCard,
    drawsLostToFullHand,
    pctSeatsAtSevenCards: seatCount === 0 ? 0 : (seatsAtSeven / seatCount) * 100,
    mismatchCount,
  };
}

