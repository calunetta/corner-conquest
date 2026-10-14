import { useGameBoard } from '@/modules/game-board';
import { useBoardBackground } from '@/modules/shared';
import { toGameBoardHeaderViewModel } from './GameBoardHeader.map';
import type { GameBoardHeaderViewProps } from './GameBoardHeader.types';

export function useGameBoardHeader(): GameBoardHeaderViewProps {
  const {
    gameState,
    isHost,
    isMyTurn,
    uiState,
    turnTimer,
    localPlayer,
    handleExitClick,
    handleStartGame,
  } = useGameBoard();
  const { isBackgroundOn, setBackgroundOn } = useBoardBackground();

  return {
    ...toGameBoardHeaderViewModel(gameState, isHost, isMyTurn, turnTimer, localPlayer),
    isExiting: uiState.isExiting,
    onExitClick: handleExitClick,
    onStartGame: handleStartGame,
    isBackgroundOn,
    onToggleBackground: setBackgroundOn,
  };
}
