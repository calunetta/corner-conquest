'use client';

import React from 'react';
import { ArrowLeft, Play, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameBoard } from '../context/GameBoardContext';

export function GameBoardHeader() {
  const { gameState, isHost, uiState, handleExitClick, handleStartGame } = useGameBoard();
  const { status, name, players, settings } = gameState;
  const canStartGame = status === 'waiting' && isHost && players.length > 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="outline" size="icon" onClick={handleExitClick} disabled={uiState.isExiting} data-testid="gameboard-exit-btn">
          {uiState.isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
        </Button>
        <h1 className="text-xl font-bold sm:text-2xl">{name}</h1>
        {status === 'playing' && (
          <div className="flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span>VP Goal: {settings.victoryPointGoal}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {canStartGame && (
          <Button onClick={handleStartGame}>
            <Play className="mr-2 h-4 w-4" /> Start Game
          </Button>
        )}
      </div>
    </div>
  );
}
