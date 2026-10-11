import type { GameState, Player } from '../../src/lib/types';
import type { LogEvent } from './log-parsers';
import type { Anomaly, SeatFinalState, TurnSnapshot } from './engine';

/** `src/modules/game-rules/services/bot-turn.service.ts`'s `setDoc` is the only way to read the
 *  state it produces each turn: it deep-clones its argument internally and never mutates it
 *  (see plan.md's "Verified context"). */
export function createFirestoreCapture() {
  let lastWrittenState: GameState | null = null;
  const stub = {
    db: {},
    doc: () => ({}),
    setDoc: async (_ref: unknown, state: GameState) => {
      lastWrittenState = state;
    },
    updateDoc: async () => {},
    // Only `handlePlayerExit` (src/lib/actions/player.ts:272) uses this, and bot turns never call
    // it. A clear failure here is better than the simulator silently producing a wrong state.
    runTransaction: async () => {
      throw new Error('Unexpected runTransaction call: handlePlayerExit should be unreachable from takeBotTurn.');
    },
  };
  return { stub, readCapturedState: () => lastWrittenState };
}

function isOwnBase(seat: number, position: { x: number; y: number }, state: GameState): boolean {
  const base = state.baseTiles.find((b) => b.owner === seat);
  return base !== undefined && base.x === position.x && base.y === position.y;
}

export function snapshotSeat(
  seat: number,
  round: number,
  events: LogEvent[],
  state: GameState,
  anomalies: Anomaly[],
): TurnSnapshot {
  const player = state.players.find((p) => p.id === seat) as Player;
  const armyPositions = player.armies.map((army) => ({ x: army.position.x, y: army.position.y }));
  const heldPositionsOnOwnBase = player.positions.filter((position) => isOwnBase(seat, position, state)).length;

  return {
    seat,
    round,
    events,
    armyPositions,
    hasArmyOffOwnBase: armyPositions.some((position) => !isOwnBase(seat, position, state)),
    heldPositions: player.positions.length,
    heldPositionsOnOwnBase,
    attackPower: player.attackPower,
    anomalies,
  };
}

export function toFinalState(player: Player): SeatFinalState {
  return {
    victoryPoints: player.victoryPoints,
    attackPower: player.attackPower,
    armyCount: player.armies.length,
    heldCards: [...player.specialCards],
    hasProductiveInHand: player.specialCards.includes('Productive'),
    hasHeldPositions: player.positions.length > 0,
  };
}
