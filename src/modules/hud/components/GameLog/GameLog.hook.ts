import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { toGameLogEntries } from './GameLog.map';
import type { GameLogViewModel } from './GameLog.types';

export function useGameLog(): GameLogViewModel {
  const { gameState } = useGameBoard();

  return {
    entries: toGameLogEntries(gameState.log || []),
  };
}
