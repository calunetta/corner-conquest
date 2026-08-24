'use client';

import React from 'react';
import { Timer, Hourglass } from 'lucide-react';
import { useGameBoard } from '../context/GameBoardContext';
import { Badge } from '@/components/ui/badge';

export function GameStatusBadge() {
  const { gameState, isMyTurn, turnTimer } = useGameBoard();
  const { status, maxPlayers, players, currentPlayerIndex } = gameState;
  const formattedTime = turnTimer?.formattedTime || '02:00';
  const isExpiring = !!turnTimer?.isExpiring;

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-xl bg-black/70 p-2 sm:px-3 sm:py-2 text-center shadow-xl backdrop-blur-md border border-white/10 select-none">
      {status === 'waiting' ? (
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-400">
          <Hourglass className="h-4 w-4 animate-spin [animation-duration:8s]" />
          <span>Waiting for players ({players.length}/{maxPlayers})</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-foreground">
            {isMyTurn ? 'Your Turn' : `${players[currentPlayerIndex]?.name || 'Player'}'s Turn`}
          </span>

          {isMyTurn && (
            <Badge
              variant="outline"
              data-testid="turn-countdown-timer"
              className={`text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                isExpiring
                  ? 'bg-destructive/20 border-destructive text-destructive animate-pulse'
                  : 'bg-primary/20 border-primary/40 text-primary'
              }`}
            >
              <Timer className={`h-3 w-3 ${isExpiring ? 'animate-spin' : ''}`} />
              {formattedTime}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
