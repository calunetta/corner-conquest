'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { PlayerInfo } from '@/modules/hud';
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
    <div className="w-full lg:w-[300px] xl:w-[330px] lg:shrink-0">
      {/* Mobile Collapsible Header */}
      <div className="lg:hidden">
        <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
          <div className="flex items-center justify-between rounded-md bg-black/20 backdrop-blur-md border border-white/10 p-2 shadow-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold">Players</h2>
              {status === 'playing' && (
                <div className="flex items-center gap-1.5 rounded bg-background/70 px-2 py-0.5 text-xs font-semibold">
                  <Trophy className="h-3 w-3 text-yellow-400" />
                  <span>Goal: {settings.victoryPointGoal} VP</span>
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
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sortedPlayers.map(p => (
                <PlayerInfo
                  key={p.playerId}
                  player={p}
                  isCurrentPlayer={p.id === currentPlayerIndex}
                  vpGoal={settings.victoryPointGoal}
                />
              ))}
              {status === 'waiting' &&
                Array.from({ length: maxPlayers - players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed bg-card/50 p-2 text-xs text-muted-foreground"
                  >
                    Waiting for player...
                  </div>
                ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop / Laptop Sleek Sidebar Column */}
      <div className="hidden lg:flex lg:flex-col lg:gap-2 h-full">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Player Information
            </span>
            <TutorialBeacon
              id="player-info"
              title="Player Information & Goal"
              description="This section shows all players' current resources, VP progress, and stats. Reach the VP Goal first to win!"
              side="right"
            />
          </div>
          {status === 'playing' && (
            <div className="flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 text-xs font-bold text-yellow-400 border border-white/5">
              <Trophy className="h-3 w-3" />
              <span>Goal: {settings.victoryPointGoal}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-120px)] pr-0.5 custom-scrollbar">
          {sortedPlayers.map(p => (
            <PlayerInfo
              key={p.playerId}
              player={p}
              isCurrentPlayer={p.id === currentPlayerIndex}
              vpGoal={settings.victoryPointGoal}
            />
          ))}
          {status === 'waiting' &&
            Array.from({ length: maxPlayers - players.length }).map((_, i) => (
              <div
                key={`empty-desktop-${i}`}
                className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed bg-black/20 border-white/10 p-2 text-xs text-muted-foreground text-center"
              >
                Waiting for player... ({players.length + i + 1}/{maxPlayers})
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
