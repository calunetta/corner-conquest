import { useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { hasPlayerRemainingActions } from '@/modules/game-rules';
import { useTurnTimer } from './turn-timer.hook';
import { useGameBoardState } from './game-board.state.hook';
import { useGameBoardActions } from './game-board.actions.hook';
import { useCardActions } from './game-board.card-actions.hook';
import { useLocalActions } from './game-board.local-actions.hook';
import { useTileClick } from './game-board.tile-click.hook';
import { useSessionHandlers } from './game-board.session.hook';
import { hasActiveDialogOrPendingAction } from './game-board.map';
import type { GameBoardContextType, GameBoardProviderProps } from './game-board.types';

export function useGameBoardProvider(
  props: Omit<GameBoardProviderProps, 'children'>
): GameBoardContextType {
  const { gameId, playerId, serverGameState, localPlayerFromServer, isMyTurn, isHost, setGameState, onExit } = props;

  const { toast } = useToast();

  const { uiState, dispatch, localGameState, setLocalGameState, gameStateForDisplay, localPlayer, selectedArmy } =
    useGameBoardState({
      serverGameState,
      localPlayerFromServer,
      playerId,
      isMyTurn,
    });

  const onAction = useGameBoardActions({
    isPerformingAction: uiState.isPerformingAction,
    isMyTurn,
    localGameState,
    serverGameState,
    setLocalGameState,
    setGameState,
  });

  const { handleCancelAction, handleUseCard } = useCardActions({
    localGameState,
    setLocalGameState,
    localPlayer,
    uiState,
    dispatch,
    onAction,
    toast,
  });

  const handleLocalAction = useLocalActions({
    localGameState,
    gameStateForDisplay,
    localPlayer,
    isMyTurn,
    uiState,
    dispatch,
    onAction,
    toast,
    handleCancelAction,
    handleUseCard,
  });

  const hasActiveDialog = useMemo(() => hasActiveDialogOrPendingAction(uiState), [uiState]);

  // Automatically end turn when player has no valid moves or affordable strategic actions left
  useEffect(() => {
    if (!isMyTurn || !gameStateForDisplay || gameStateForDisplay.status !== 'playing' || !localPlayer) {
      return;
    }

    const hasRemaining = hasPlayerRemainingActions(
      gameStateForDisplay,
      localPlayer,
      hasActiveDialog
    );
    if (!hasRemaining) {
      const autoEndTimer = setTimeout(() => {
        onAction('end-turn');
        toast({
          title: 'Turn Completed',
          description: 'No further actions available this turn.',
        });
      }, 700);
      return () => clearTimeout(autoEndTimer);
    }
  }, [isMyTurn, gameStateForDisplay, localPlayer, hasActiveDialog, onAction, toast]);

  const handleTileClick = useTileClick({
    gameStateForDisplay,
    isMyTurn,
    uiState,
    dispatch,
    localPlayer,
    selectedArmy,
    onAction,
    toast,
  });

  const { handleStartGame, handleExitClick, handleConfirmExit, handleConfirmHostLeave } = useSessionHandlers({
    gameId,
    serverGameState,
    localPlayerFromServer,
    localPlayerName: localPlayer?.name,
    isHost,
    dispatch,
    setGameState,
    onExit,
    toast,
  });

  const turnTimer = useTurnTimer({
    isMyTurn,
    gameStatus: serverGameState?.status || '',
    onAction,
  });

  const contextValue = useMemo<GameBoardContextType>(
    () => ({
      uiState,
      dispatch,
      gameState: gameStateForDisplay,
      localPlayer,
      isMyTurn,
      isHost,
      selectedArmy,
      turnTimer,
      onAction,
      onLocalAction: handleLocalAction,
      handleTileClick,
      handleStartGame,
      handleExitClick,
      handleConfirmExit,
      handleConfirmHostLeave,
    }),
    [
      uiState,
      gameStateForDisplay,
      localPlayer,
      isMyTurn,
      isHost,
      selectedArmy,
      turnTimer,
      onAction,
      handleLocalAction,
      handleTileClick,
      handleStartGame,
      handleExitClick,
      handleConfirmExit,
      handleConfirmHostLeave,
      dispatch,
    ]
  );

  return contextValue;
}
