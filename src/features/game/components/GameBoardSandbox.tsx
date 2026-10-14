'use client';

import { useCallback, useState } from 'react';
import type { GameAction, GameState } from '@/lib/types';
import { handleGameAction } from '@/modules/game-rules';
import { GameBoardProvider } from '../context/GameBoardContext';
import { GameBoardContent } from './GameBoard';
import { buildPositionRaceGameState, SANDBOX_PLAYER_ID } from './GameBoardSandbox.fixtures';

/**
 * Renders the real interactive game board against a local-only GameState (no Firestore, no
 * emulator) so a specific client-side race can be clicked through directly in the testbed.
 * `setGameState` mirrors `useGameEngine`'s local-write path (`handleGameAction` then a plain
 * state set), just without the Firestore round trip. See
 * docs/ai/tasks/2026-10-13-bot-ui-position-stall.
 */
export function GameBoardSandbox() {
  const [gameState, setGameState] = useState<GameState>(buildPositionRaceGameState);

  const setGameStateLocal = useCallback(async (currentState: GameState, action: GameAction, payload?: unknown) => {
    const result = handleGameAction({ action, gameState: currentState, payload });
    if (result.state) setGameState(result.state);
  }, []);

  return (
    <GameBoardProvider
      gameId="sandbox_game"
      playerId={SANDBOX_PLAYER_ID}
      serverGameState={gameState}
      localPlayerFromServer={gameState.players[0]}
      isMyTurn
      isHost
      setGameState={setGameStateLocal}
      onExit={() => {}}
    >
      <GameBoardContent />
    </GameBoardProvider>
  );
}
