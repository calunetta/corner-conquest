import { CardName } from '../../../src/lib/types/cards';
import type { MatchResult } from '../engine';

const ALL_CARD_NAMES = Object.values(CardName);
/** Cards the game only ever lets a player use on themself/their own turn; the bot never has an
 *  opponent human to target, so a dead-for-bots flag on these would be misleading noise. */
const HUMAN_ONLY_CARDS: CardName[] = [CardName.Sabotage];

function zeros(count: number): number[] {
  return new Array(count).fill(0);
}

// --- M10: bot health and the gate -----------------------------------------------------------------

export interface BotHealthMetrics {
  bySeat: Array<{
    seat: number;
    firstRoundOffOwnBase: number | null; // null across matches where it never happened
    neverLeftBase: boolean; // true only when true in every match (see computeM10's per-match logic)
    pctPositionsOnOwnBase: number;
    trappedWithProductive: boolean;
    everUnusedCards: CardName[]; // cards this seat acquired at least once but consumed zero times, across the run
  }>;
  neverLeftBasePct: number;
  basePositionsPct: number;
  trappedPct: number;
}

export function computeM10(results: MatchResult[], seatCount: number): BotHealthMetrics {
  const firstOffBaseRoundsBySeat: Array<number | null> = zeros(seatCount).map(() => null);
  const everLeftBySeat = zeros(seatCount).map(() => 0);
  const matchCountBySeat = zeros(seatCount).map(() => 0);
  const positionsTotal = zeros(seatCount);
  const positionsOnBase = zeros(seatCount);
  const trappedCount = zeros(seatCount);
  const acquiredBySeat: Array<Set<CardName>> = Array.from({ length: seatCount }, () => new Set());
  const consumedBySeat: Array<Set<CardName>> = Array.from({ length: seatCount }, () => new Set());

  results.forEach((result) => {
    const leftBaseThisMatch = zeros(seatCount).map(() => false);
    result.turns.forEach((turn) => {
      positionsTotal[turn.seat] += turn.heldPositions;
      positionsOnBase[turn.seat] += turn.heldPositionsOnOwnBase;
      if (turn.hasArmyOffOwnBase) {
        leftBaseThisMatch[turn.seat] = true;
        if (firstOffBaseRoundsBySeat[turn.seat] === null) firstOffBaseRoundsBySeat[turn.seat] = turn.round;
      }
      turn.events.forEach((event) => {
        if (event.kind === 'cardBought' || event.kind === 'specialIslandCardFound') acquiredBySeat[turn.seat].add(event.cardName);
        if (event.kind === 'cardConsumed') consumedBySeat[turn.seat].add(event.cardName);
      });
    });
    result.finalState.forEach((seat, i) => {
      matchCountBySeat[i] += 1;
      if (leftBaseThisMatch[i]) everLeftBySeat[i] += 1;
      if (seat.hasProductiveInHand && seat.hasHeldPositions) trappedCount[i] += 1;
    });
  });

  const bySeat = Array.from({ length: seatCount }, (_, seat) => ({
    seat,
    firstRoundOffOwnBase: firstOffBaseRoundsBySeat[seat],
    neverLeftBase: matchCountBySeat[seat] > 0 && everLeftBySeat[seat] === 0,
    pctPositionsOnOwnBase: positionsTotal[seat] === 0 ? 0 : (positionsOnBase[seat] / positionsTotal[seat]) * 100,
    trappedWithProductive: matchCountBySeat[seat] > 0 && trappedCount[seat] / matchCountBySeat[seat] > 0,
    everUnusedCards: ALL_CARD_NAMES.filter(
      (name) =>
        !HUMAN_ONLY_CARDS.includes(name) && acquiredBySeat[seat].has(name) && !consumedBySeat[seat].has(name),
    ),
  }));

  const seatsEver = matchCountBySeat.filter((count) => count > 0).length || 1;
  return {
    bySeat,
    neverLeftBasePct: (bySeat.filter((s) => s.neverLeftBase).length / seatsEver) * 100,
    basePositionsPct:
      positionsTotal.reduce((a, b) => a + b, 0) === 0
        ? 0
        : (positionsOnBase.reduce((a, b) => a + b, 0) / positionsTotal.reduce((a, b) => a + b, 0)) * 100,
    trappedPct: (bySeat.filter((s) => s.trappedWithProductive).length / seatsEver) * 100,
  };
}

