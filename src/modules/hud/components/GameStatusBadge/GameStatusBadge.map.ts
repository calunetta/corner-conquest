import type { GameState } from '@/lib/types';
import type { GameStatusBadgeViewModel } from './GameStatusBadge.types';
import type { TurnTimer } from '../GameBoardHeader/GameBoardHeader.types';

export function toGameStatusBadgeViewModel(
  gameState: GameState,
  isMyTurn: boolean,
  turnTimer: TurnTimer,
): GameStatusBadgeViewModel {
  const { status, maxPlayers, players, currentPlayerIndex } = gameState;
  const formattedTime = turnTimer?.formattedTime || '02:00';
  const isExpiring = !!turnTimer?.isExpiring;
  const turnLabel = isMyTurn ? 'Your Turn' : `${players[currentPlayerIndex]?.name || 'Player'}'s Turn`;

  return {
    isWaiting: status === 'waiting',
    playerCount: players.length,
    maxPlayers,
    turnLabel,
    isMyTurn,
    formattedTime,
    isExpiring,
  };
}
