import { useGameBoard } from '@/modules/game-board';
import { toGameBoardHeaderViewModel } from './GameBoardHeader.map';
import type { GameBoardHeaderViewProps } from './GameBoardHeader.types';

export function useGameBoardHeader(): GameBoardHeaderViewProps {
  const { gameState, isHost, isMyTurn, uiState, turnTimer, handleExitClick, handleStartGame } =
    useGameBoard();

  return {
    ...toGameBoardHeaderViewModel(gameState, isHost, isMyTurn, turnTimer),
    isExiting: uiState.isExiting,
    onExitClick: handleExitClick,
    onStartGame: handleStartGame,
  };
}
