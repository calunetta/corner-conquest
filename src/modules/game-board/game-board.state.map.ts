import type { GameState } from '@/lib/types';

/**
 * Carries forward out-of-band seat-management fields from the latest `serverGameState` into the
 * turn-holder's local buffer, for every seat except `localPlayerId`'s own. These four fields
 * (isBot, isVacant, lastSeenAt, reclaimRequested) are written by handlePlayerExit, handleSeatReclaim
 * and applyDeferredReclaim (src/modules/game-rules/services/player-exit.service.ts,
 * player-reclaim.service.ts, turn-start-passives.reducer.ts), and by the per-seat heartbeat
 * (writeHeartbeat in src/modules/game-board/services/game-board.engine.service.ts). The heartbeat only
 * stamps the writing client's own seat, and none of them is a normal gameplay action, so this cannot
 * clobber the turn-holder's own in-progress optimistic changes to another seat.
 * Returns `localGameState` unchanged (same reference) if nothing differs, so callers can skip
 * `setLocalGameState` and avoid an unnecessary re-render.
 */
export function withSyncedSeatManagement(
  localGameState: GameState,
  serverGameState: GameState,
  localPlayerId: string | null,
): GameState {
  let changed = false;

  const players = localGameState.players.map((seat, index) => {
    if (seat.playerId === localPlayerId) return seat;

    const serverSeat = serverGameState.players[index];
    if (!serverSeat || serverSeat.playerId !== seat.playerId) return seat;

    if (
      seat.isBot === serverSeat.isBot &&
      seat.isVacant === serverSeat.isVacant &&
      seat.lastSeenAt === serverSeat.lastSeenAt &&
      seat.reclaimRequested === serverSeat.reclaimRequested
    ) {
      return seat;
    }

    changed = true;
    return {
      ...seat,
      isBot: serverSeat.isBot,
      isVacant: serverSeat.isVacant,
      lastSeenAt: serverSeat.lastSeenAt,
      reclaimRequested: serverSeat.reclaimRequested,
    };
  });

  return changed ? { ...localGameState, players } : localGameState;
}
