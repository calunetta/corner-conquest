import { useGameBoard } from '@/modules/game-board';
import { toGameStatusBadgeViewModel } from './GameStatusBadge.map';
import type { GameStatusBadgeViewModel } from './GameStatusBadge.types';

export function useGameStatusBadge(): GameStatusBadgeViewModel {
  const { gameState, isMyTurn, turnTimer } = useGameBoard();

  return toGameStatusBadgeViewModel(gameState, isMyTurn, turnTimer);
}
