'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { PlayerInfo } from '@/features/game/panels/PlayerInfo';
import { TutorialBeacon } from './TutorialBeacon';
import { useGameBoard } from '../context/GameBoardContext';

export function PlayerInfoBar() {
  const { gameState } = useGameBoard();
  const isMobile = useIsMobile();
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(!isMobile);

  useEffect(() => {
    setIsPlayerInfoOpen(!isMobile);
  }, [isMobile]);

  const { status, maxPlayers, players, currentPlayerIndex, settings } = gameState;

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    return [...players].sort((a, b) => a.id - b.id);
  }, [players]);

  return (
    <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
      <div className="flex items-center justify-between rounded-md bg-black/20 backdrop-blur-md border border-white/10 p-2 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold sm:text-lg">Player Information</h2>
          {status === 'playing' && (
            <div className="flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span>VP Goal: {settings.victoryPointGoal}</span>
            </div>
          )}
          <TutorialBeacon
            id="player-info"
            title="Player Information & Goal"
            description="This section shows your current resources, VP, and the Victory Point goal to win the game. Gather resources by positioning armies and spend them in the Shop!"
            side="bottom"
          />
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {sortedPlayers.map(p => (
            <PlayerInfo key={p.playerId} player={p} isCurrentPlayer={p.id === currentPlayerIndex} />
          ))}
          {status === 'waiting' &&
            Array.from({ length: maxPlayers - players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex h-full min-h-24 items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-sm text-muted-foreground sm:min-h-28 sm:text-base"
              >
                Waiting for player...
              </div>
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
