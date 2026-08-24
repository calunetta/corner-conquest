'use client';

import React from 'react';
import { ArrowLeft, Play, Trophy, Loader2, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameBoard } from '../context/GameBoardContext';

export function GameBoardHeader() {
  const { gameState, isHost, uiState, isMyTurn, turnTimer, handleExitClick, handleStartGame } = useGameBoard();
  const { status, name, players, settings, currentPlayerIndex } = gameState;
  const canStartGame = status === 'waiting' && isHost && players.length > 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="outline" size="icon" onClick={handleExitClick} disabled={uiState.isExiting} data-testid="gameboard-exit-btn">
          {uiState.isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
        </Button>
        <h1 className="text-xl font-bold sm:text-2xl truncate max-w-[200px] sm:max-w-md">{name}</h1>
        {status === 'playing' && (
          <div className="flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold border border-white/5">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span>VP Goal: {settings.victoryPointGoal}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === 'playing' && (
          <div className="flex items-center gap-1.5 rounded-md bg-black/40 border border-white/10 px-2.5 py-1 text-xs font-semibold">
            <Timer className={`h-3.5 w-3.5 ${turnTimer.isExpiring ? 'text-destructive animate-pulse' : 'text-primary'}`} />
            <span className="text-muted-foreground hidden sm:inline">Turn:</span>
            <span className="font-bold text-foreground">{players[currentPlayerIndex]?.name}</span>
            {isMyTurn && (
              <span className={`font-mono font-bold ${turnTimer.isExpiring ? 'text-destructive' : 'text-primary'}`}>
                ({turnTimer.formattedTime})
              </span>
            )}
          </div>
        )}

        {canStartGame && (
          <Button onClick={handleStartGame} className="font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black">
            <Play className="mr-2 h-4 w-4" /> Start Game
          </Button>
        )}
      </div>
    </div>
  );
}
