import { useEffect } from 'react';
import { GameStatus } from '@/lib/types';
import type { Player } from '@/lib/types';
import { writeHeartbeat } from './services/game-board.engine.service';

export const HEARTBEAT_INTERVAL_MS = 15_000;

interface HeartbeatArgs {
  gameId: string;
  localPlayer: Player | null;
  status: GameStatus | undefined;
}

async function sendHeartbeat(gameId: string, seatIndex: number): Promise<void> {
  try {
    await writeHeartbeat(gameId, seatIndex);
  } catch (error) {
    // A missed heartbeat is retried on the next tick; a toast every 15s would be noise.
    console.error('Error writing heartbeat:', error);
  }
}

/** Stamps this player's seat as alive while the match is in progress, so peers can detect a dropped connection. */
export function useHeartbeat({ gameId, localPlayer, status }: HeartbeatArgs): void {
  const isSendingHeartbeats = status === GameStatus.Playing && localPlayer !== null && !localPlayer.isBot;
  const seatIndex = localPlayer?.id;

  useEffect(() => {
    if (!isSendingHeartbeats || seatIndex === undefined) return;

    // Sent immediately so a reconnecting player's seat is fresh before the first interval tick.
    void sendHeartbeat(gameId, seatIndex);
    const intervalId = setInterval(() => {
      void sendHeartbeat(gameId, seatIndex);
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [gameId, seatIndex, isSendingHeartbeats]);
}
