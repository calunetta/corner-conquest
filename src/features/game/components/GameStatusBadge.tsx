'use client';

import React from 'react';
import { useGameBoard } from '../context/GameBoardContext';

export function GameStatusBadge() {
  const { gameState, isMyTurn } = useGameBoard();
  const { status, maxPlayers, players, currentPlayerIndex } = gameState;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-20 rounded-lg bg-background/80 p-2 text-center shadow-md backdrop-blur-sm">
      {status === 'waiting' ? (
        <p className="text-base font-semibold text-accent sm:text-lg">
          Waiting for players... ({players.length}/{maxPlayers})
        </p>
      ) : (
        <p className="text-sm font-semibold text-accent sm:text-base">
          {isMyTurn ? 'Your Turn!' : `${players[currentPlayerIndex]?.name || 'Player'}'s Turn`}
        </p>
      )}
    </div>
  );
}
