import { useEffect, useRef } from 'react';
import { GameStatus } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { handlePlayerExit } from '@/modules/game-rules';

export const STALE_THRESHOLD_MS = 120_000;
export const STALENESS_CHECK_INTERVAL_MS = 20_000;

interface StalenessCheckArgs {
  gameId: string;
  gameState: GameState | null;
  localPlayerId: string | null;
}

/** Peers that are human-controlled, not this client, and whose last heartbeat is older than the threshold. */
function findStalePeerIds(gameState: GameState, localPlayerId: string | null, now: number): string[] {
  return gameState.players
    .filter((player) => !player.isBot && player.playerId !== localPlayerId)
    .filter((player) => {
      const lastSeenAt = gameState.heartbeats[player.id];
      return lastSeenAt !== undefined && now - lastSeenAt > STALE_THRESHOLD_MS;
    })
    .map((player) => player.playerId);
}

/** Async wrapper so a synchronous throw from `handlePlayerExit` also becomes a rejection that gets logged. */
async function convertStalePeer(gameId: string, playerId: string): Promise<void> {
  await handlePlayerExit(gameId, playerId);
}

/**
 * Every connected client watches its peers, not a single elected driver. A driver chosen before a
 * conversion can be the very seat that went dark. Each conversion runs in a transaction, so two
 * clients converting the same seat is harmless: the second one sees it already a bot and no-ops.
 */
export function useStalenessCheck({ gameId, gameState, localPlayerId }: StalenessCheckArgs): void {
  const gameStateRef = useRef<GameState | null>(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const isPlaying = gameState?.status === GameStatus.Playing;

  // Reads the latest snapshot through the ref so the interval is not restarted on every snapshot.
  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = setInterval(() => {
      const latestState = gameStateRef.current;
      if (!latestState) return;

      findStalePeerIds(latestState, localPlayerId, Date.now()).forEach((playerId) => {
        convertStalePeer(gameId, playerId).catch((error) => {
          console.error('Error converting stale player:', error);
        });
      });
    }, STALENESS_CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [gameId, isPlaying, localPlayerId]);
}
