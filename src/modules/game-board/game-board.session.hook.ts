import { useCallback } from 'react';
import { handlePlayerExit } from '@/lib/actions';
import { startGame } from '@/lib/game-initializer';
import type { SessionHandlers, SessionHandlersArgs } from './game-board.hook.types';

export function useSessionHandlers({
  gameId,
  serverGameState,
  localPlayerFromServer,
  localPlayerName,
  isHost,
  dispatch,
  setGameState,
  onExit,
  toast,
}: SessionHandlersArgs): SessionHandlers {
  const handleStartGame = useCallback(async () => {
    if (!serverGameState || !isHost) return;
    toast({ title: 'Game Started!', description: 'Let the conquest begin!' });
    const startedGame = startGame(serverGameState, localPlayerName || 'The host');
    setGameState(startedGame, 'end-turn', {});
  }, [serverGameState, isHost, localPlayerName, setGameState, toast]);

  const handleConfirmExit = useCallback(async () => {
    dispatch({ type: 'SET_CONFIRM_EXIT_DIALOG', open: false });
    if (!localPlayerFromServer) return;
    dispatch({ type: 'SET_EXITING', isExiting: true });
    try {
      await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    } catch (error) {
      console.error('Error exiting game:', error);
    } finally {
      onExit();
      dispatch({ type: 'SET_EXITING', isExiting: false });
    }
  }, [gameId, localPlayerFromServer, dispatch, onExit]);

  const handleConfirmHostLeave = useCallback(async () => {
    dispatch({ type: 'SET_HOST_LEAVE_DIALOG', open: false });
    if (!localPlayerFromServer) return;
    try {
      await handlePlayerExit(gameId, localPlayerFromServer.playerId);
    } catch (error) {
      console.error('Error host leaving game:', error);
    } finally {
      onExit();
    }
  }, [gameId, localPlayerFromServer, dispatch, onExit]);

  const handleExitClick = useCallback(async () => {
    if (!serverGameState || !localPlayerFromServer) return;

    if (isHost) {
      dispatch({ type: 'SET_HOST_LEAVE_DIALOG', open: true });
      return;
    }

    if (serverGameState.status === 'playing') {
      dispatch({ type: 'SET_CONFIRM_EXIT_DIALOG', open: true });
    } else {
      await handleConfirmExit();
    }
  }, [serverGameState, localPlayerFromServer, isHost, handleConfirmExit, dispatch]);

  return {
    handleStartGame,
    handleExitClick,
    handleConfirmExit,
    handleConfirmHostLeave,
  };
}
