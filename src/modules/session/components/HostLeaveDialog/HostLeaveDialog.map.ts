import { GameStatus } from '@/lib/types';

/** Pure. Mirrors legacy HostLeaveDialog.tsx's description() exactly. */
export function toHostLeaveDescription(gameStatus: GameStatus, isLastPlayer: boolean): string {
  if (gameStatus === GameStatus.Playing) {
    return 'You are the host. If you leave a game in progress, the game room will be closed, and the match will end for all players.';
  }
  if (isLastPlayer) {
    return 'You are the only player remaining. If you leave, the game room will be dismantled.';
  }
  return 'As the host, if you leave now, the next player in line will become the new host.';
}
