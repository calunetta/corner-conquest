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

  const heartbeats = syncedHeartbeats(localGameState.heartbeats, serverGameState.heartbeats);
  if (heartbeats !== localGameState.heartbeats) changed = true;

  return changed ? { ...localGameState, players, heartbeats } : localGameState;
}

/**
 * Every seat's heartbeat, taken from `server`, including the local seat's own. Heartbeats are an
 * independent, continuously updated side channel (`useHeartbeat`, on its own 15s interval regardless
 * of whose turn it is), never part of any seat's own in-turn gameplay mutations, so there is no
 * "don't clobber the turn-holder's in-flight state" concern to protect here, unlike the per-seat
 * fields in `withSyncedSeatManagement`. `server` is always at least as fresh as `local` for every
 * seat's heartbeat. Returns `local` unchanged (same reference) if nothing differs.
 */
export function syncedHeartbeats(
  local: GameState['heartbeats'],
  server: GameState['heartbeats'],
): GameState['heartbeats'] {
  const keys = new Set([...Object.keys(local), ...Object.keys(server)]);
  const isSame = [...keys].every((key) => local[Number(key)] === server[Number(key)]);
  return isSame ? local : { ...server };
}
