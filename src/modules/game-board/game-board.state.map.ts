import type { GameState } from '@/lib/types';

/**
 * Carries forward out-of-band seat-management fields from the latest `serverGameState` into the
 * turn-holder's local buffer, for every seat except `localPlayerId`'s own. These three fields
 * (isBot, isVacant, reclaimRequested) are written by handlePlayerExit, handleSeatReclaim
 * and applyDeferredReclaim (src/modules/game-rules/services/player-exit.service.ts,
 * player-reclaim.service.ts, turn-start-passives.reducer.ts). `heartbeats` is synced separately
 * (see `syncedHeartbeats`) since it lives at the top level of `GameState`, not per seat. None of
 * these is a normal gameplay action, so this cannot clobber the turn-holder's own in-progress
 * optimistic changes to another seat.
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
      seat.reclaimRequested === serverSeat.reclaimRequested
    ) {
      return seat;
    }

    changed = true;
    return {
      ...seat,
      isBot: serverSeat.isBot,
      isVacant: serverSeat.isVacant,
      reclaimRequested: serverSeat.reclaimRequested,
    };
  });

  const localSeatId = localGameState.players.find((player) => player.playerId === localPlayerId)?.id;
  const heartbeats = syncedHeartbeats(localGameState.heartbeats, serverGameState.heartbeats, localSeatId);
  if (heartbeats !== localGameState.heartbeats) changed = true;

  return changed ? { ...localGameState, players, heartbeats } : localGameState;
}

/** Every seat's heartbeat from the server, except `localSeatId`'s own (kept from `local` so this
 *  cannot clobber the turn-holder's own in-flight state — same non-clobber rule as the per-seat
 *  fields above). Returns `local` unchanged (same reference) if nothing differs. */
function syncedHeartbeats(
  local: GameState['heartbeats'],
  server: GameState['heartbeats'],
  localSeatId: number | undefined,
): GameState['heartbeats'] {
  const merged: GameState['heartbeats'] = { ...server };
  if (localSeatId !== undefined) {
    if (localSeatId in local) {
      merged[localSeatId] = local[localSeatId];
    } else {
      delete merged[localSeatId];
    }
  }

  const keys = new Set([...Object.keys(local), ...Object.keys(merged)]);
  const isSame = [...keys].every((key) => local[Number(key)] === merged[Number(key)]);
  return isSame ? local : merged;
}
