import React, { useReducer, useEffect, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { getPossibleMoves } from '@/modules/game-rules';
import type { GameState } from '@/lib/types';
import { gameBoardReducer } from './game-board.reducer';
import { initialUIState } from './game-board.types';
import type { GameBoardStateArgs, GameBoardState } from './game-board.hook.types';

export function useGameBoardState({
  serverGameState,
  localPlayerFromServer,
  playerId,
  isMyTurn,
}: GameBoardStateArgs): GameBoardState {
  const [uiState, dispatch] = useReducer(gameBoardReducer, initialUIState);
  const [localGameState, setLocalGameState] = React.useState<GameState | null>(null);

  const gameStateForDisplay = isMyTurn && localGameState ? localGameState : serverGameState;

  const localPlayer = useMemo(() => {
    if (!gameStateForDisplay || !playerId) return localPlayerFromServer;
    return gameStateForDisplay.players.find((p) => p.playerId === playerId) || localPlayerFromServer;
  }, [gameStateForDisplay, playerId, localPlayerFromServer]);

  useEffect(() => {
    // Gated on `status === 'playing'`, not just `isMyTurn`: the match creator is always seated at
    // index 0, so `isMyTurn` is already true while solo and still `waiting` for other players. Without
    // this gate, the buffer would seed then (a 1-player, waiting snapshot) and never re-seed once the
    // match starts, since `isMyTurn` stays true across that transition - live joins would never appear.
    if (isMyTurn && serverGameState?.status === 'playing' && !localGameState) {
      setLocalGameState(cloneDeep(serverGameState));
    } else if (!isMyTurn && localGameState) {
      setLocalGameState(null);
    }
  }, [isMyTurn, serverGameState, localGameState]);

  const selectedArmy = useMemo(() => {
    if (!gameStateForDisplay || uiState.selectedArmyId === null || !localPlayer) return null;
    const player = gameStateForDisplay.players.find((p) => p.id === localPlayer.id);
    return player?.armies.find((a) => a.id === uiState.selectedArmyId) || null;
  }, [gameStateForDisplay, uiState.selectedArmyId, localPlayer]);

  // Reset local UI dialogs and army selection when turn ends
  useEffect(() => {
    if (!isMyTurn) {
      dispatch({ type: 'RESET_TURN_UI' });
    }
  }, [isMyTurn]);

  // Recalculate possible moves when selectedArmy changes
  useEffect(() => {
    if (selectedArmy && gameStateForDisplay && isMyTurn) {
      const moves = getPossibleMoves(gameStateForDisplay, selectedArmy);
      dispatch({ type: 'SET_POSSIBLE_MOVES', possibleMoves: moves });
    } else {
      dispatch({ type: 'SET_POSSIBLE_MOVES', possibleMoves: [] });
    }
  }, [selectedArmy, gameStateForDisplay, isMyTurn]);

  return {
    uiState,
    dispatch,
    localGameState,
    setLocalGameState,
    gameStateForDisplay,
    localPlayer,
    selectedArmy,
  };
}
