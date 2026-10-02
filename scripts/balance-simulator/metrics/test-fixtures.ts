import type { LogEvent } from '../log-parsers';
import type { MatchResult, SeatFinalState, TurnSnapshot } from '../engine';

/** Builds a minimal, valid TurnSnapshot; override only the fields a test cares about. */
export function turn(overrides: Partial<TurnSnapshot> & { seat: number }): TurnSnapshot {
  return {
    round: 1,
    events: [],
    armyPositions: [{ x: 0, y: 0 }],
    hasArmyOffOwnBase: false,
    heldPositions: 0,
    heldPositionsOnOwnBase: 0,
    attackPower: 0,
    ...overrides,
  };
}

/** Builds a minimal, valid SeatFinalState; override only the fields a test cares about. */
export function seatFinal(overrides: Partial<SeatFinalState> = {}): SeatFinalState {
  return {
    victoryPoints: 0,
    attackPower: 0,
    armyCount: 1,
    heldCards: [],
    hasProductiveInHand: false,
    hasHeldPositions: false,
    ...overrides,
  };
}

/** Builds a minimal, valid MatchResult; override only the fields a test cares about. */
export function match(overrides: Partial<MatchResult> & { finalState: SeatFinalState[] }): MatchResult {
  return {
    outcome: 'finished',
    rounds: 10,
    botTurns: overrides.turns?.length ?? 0,
    winnerSeat: null,
    turns: [],
    ...overrides,
  };
}

export function events(...kinds: LogEvent[]): LogEvent[] {
  return kinds;
}
