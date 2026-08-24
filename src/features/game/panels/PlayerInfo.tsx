'use client';

import React from 'react';
import type { Player } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceIcon } from '@/components/icons';
import { Award, Swords, Zap, Album, Forward, Ban, Bot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { useGameBoard } from '../context/GameBoardContext';

type PlayerInfoProps = {
  player: Player;
  isCurrentPlayer: boolean;
  vpGoal?: number;
};

const playerBorderColors: Record<string, string> = {
  blue: 'border-l-blue-500',
  red: 'border-l-red-500',
  purple: 'border-l-purple-500',
  yellow: 'border-l-yellow-400',
};

const playerBgGlow: Record<string, string> = {
  blue: 'bg-blue-500/10',
  red: 'bg-red-500/10',
  purple: 'bg-purple-500/10',
  yellow: 'bg-yellow-400/10',
};

export function PlayerInfo({ player, isCurrentPlayer, vpGoal = 10 }: PlayerInfoProps) {
  const { turnTimer, isMyTurn } = useGameBoard();
  const armyCount = player.armies ? player.armies.length : player.armyCount;
  const vpPercent = Math.min(100, Math.round((player.victoryPoints / vpGoal) * 100));

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'transition-all duration-300 bg-background/50 backdrop-blur-xl border-white/10 shadow-lg border-l-4 relative overflow-hidden',
          playerBorderColors[player.color] || 'border-l-primary',
          isCurrentPlayer
            ? 'ring-2 ring-accent shadow-[0_0_20px_rgba(var(--accent),0.35)] scale-[1.02] bg-accent/5'
            : 'hover:scale-[1.01]',
          playerBgGlow[player.color]
        )}
      >
        <CardContent className="p-2 sm:p-2.5 flex flex-col gap-1.5">
          {/* Header Row: Avatar + Name + Badges */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="relative h-8 w-8 shrink-0 rounded-full bg-black/40 p-0.5 border border-white/10 overflow-hidden flex items-center justify-center">
                <Image
                  src={PLAYER_DATA[player.color]?.sprite.idle || '/sprites/blue_idle.gif'}
                  alt={`${player.color} player`}
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold truncate text-foreground">
                    {player.name}
                  </span>
                  {player.isBot && (
                    <Bot className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>
            </div>

            {/* Turn & Status Badges */}
            <div className="flex items-center gap-1 shrink-0">
              {isCurrentPlayer && (
                <Badge
                  className={`text-[10px] px-1.5 py-0 font-extrabold flex items-center gap-1 ${
                    turnTimer.isExpiring
                      ? 'bg-destructive text-destructive-foreground animate-pulse'
                      : 'bg-accent text-accent-foreground'
                  }`}
                >
                  <span>TURN</span>
                  {isMyTurn && <span className="font-mono">{turnTimer.formattedTime}</span>}
                </Badge>
              )}
              {player.isSabotaged && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 flex items-center gap-0.5">
                      <Ban className="h-2.5 w-2.5" /> Skip
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sabotaged: misses next turn</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {player.hasExtraMove && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Forward className="h-3.5 w-3.5 text-accent animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Extra Move active</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Victory Points Progress Bar */}
          <div className="w-full flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            <div className="flex-1 bg-black/40 h-2 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-300 transition-all duration-500 rounded-full"
                style={{ width: `${vpPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-yellow-400 shrink-0">
              {player.victoryPoints}/{vpGoal}
            </span>
          </div>

          {/* Stats & Resources Row */}
          <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-white/5">
            {/* Army & Attack Power */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 font-semibold text-foreground">
                    <Swords className="h-3 w-3 text-muted-foreground" />
                    <span>{armyCount}/5</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Armies on board</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 font-semibold text-foreground">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span>+{player.attackPower}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attack Power (bonus dice)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Resources Breakdown Pills */}
            <div className="flex items-center gap-1">
              {Object.entries(player.resources).map(([type, value]) => (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 rounded bg-black/40 px-1 py-0.5 border border-white/5">
                      <ResourceIcon type={type as keyof Player['resources']} className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="font-bold text-[10px] text-foreground">{value}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="capitalize">{type}: {value}</p>
                  </TooltipContent>
                </Tooltip>
              ))}

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 rounded bg-black/40 px-1 py-0.5 border border-white/5">
                    <Album className="h-2.5 w-2.5 text-purple-400" />
                    <span className="font-bold text-[10px] text-foreground">{player.specialCards.length}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Special Cards: {player.specialCards.length}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
