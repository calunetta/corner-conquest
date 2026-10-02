'use client';

import React from 'react';
import type { Player } from '@/lib/types';
import { ResourceType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceIcon, FightIcon } from '@/components/icons';
import { Award, Zap, Album, Forward, Ban, Bot, Compass, ShieldCheck, Sparkles, Anchor, Trophy, Hammer } from 'lucide-react';
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

const playerRingColors: Record<string, string> = {
  blue: 'ring-blue-500/40',
  red: 'ring-red-500/40',
  purple: 'ring-purple-500/40',
  yellow: 'ring-yellow-400/40',
};

export const PlayerInfo = React.memo(function PlayerInfo({ player, isCurrentPlayer, vpGoal = 10 }: PlayerInfoProps) {
  const { turnTimer, isMyTurn } = useGameBoard();
  const armyCount = player.armies ? player.armies.length : (player.armyCount ?? 0);
  const positionedCount = player.positions ? player.positions.length : 0;
  const victoryPoints = player.victoryPoints ?? 0;
  const vpPercent = Math.min(100, Math.max(0, Math.round((victoryPoints / vpGoal) * 100)));
  const specialCardsCount = player.specialCards ? player.specialCards.length : 0;
  const attackPower = player.attackPower ?? 0;

  const food = player.resources?.food ?? 0;
  const wood = player.resources?.wood ?? 0;
  const gold = player.resources?.gold ?? 0;

  const hasPassiveCollector = !!player.passiveAbilities?.collector;
  const hasPassiveExplorer = !!player.passiveAbilities?.explorer;

  const activeBuffs = [
    hasPassiveCollector && { id: 'collector', label: 'Collector', icon: <Sparkles className="h-2.5 w-2.5 text-emerald-400" />, desc: 'Collector: +1 extra food on harvest' },
    hasPassiveExplorer && { id: 'explorer', label: 'Explorer', icon: <Compass className="h-2.5 w-2.5 text-cyan-400" />, desc: 'Explorer: +1 extra movement range' },
    player.reinforceActive && { id: 'reinforce', label: 'Reinforce', icon: <ShieldCheck className="h-2.5 w-2.5 text-blue-400" />, desc: 'Reinforce active: next deploy is free' },
    player.efficientActive && { id: 'efficient', label: 'Efficient', icon: <Zap className="h-2.5 w-2.5 text-amber-400" />, desc: 'Efficient active: next deploy 50% off' },
    player.masterBuilderActive && { id: 'builder', label: 'Builder', icon: <Hammer className="h-2.5 w-2.5 text-orange-400" />, desc: 'Master Builder active: upgrade cost waived' },
    player.hasExtraMove && { id: 'extra-move', label: 'Extra Move', icon: <Forward className="h-2.5 w-2.5 text-yellow-300" />, desc: 'Extra Move active this turn' },
    player.isSabotaged && { id: 'sabotaged', label: 'Sabotaged', icon: <Ban className="h-2.5 w-2.5 text-red-400" />, desc: 'Sabotaged: misses next turn' },
  ].filter(Boolean) as { id: string; label: string; icon: React.ReactNode; desc: string }[];

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'transition-all duration-300 bg-background/50 backdrop-blur-xl border-white/10 shadow-lg border-l-4 relative overflow-hidden',
          playerBorderColors[player.color] || 'border-l-primary',
          isCurrentPlayer
            ? 'ring-2 ring-accent shadow-[0_0_24px_rgba(var(--accent),0.4)] scale-[1.01] bg-accent/5'
            : 'hover:scale-[1.005]',
          playerBgGlow[player.color]
        )}
      >
        <CardContent className="p-2.5 sm:p-3 flex flex-col gap-2">
          {/* Header Row: Avatar + Name + Turn Timer Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={cn(
                  'relative h-9 w-9 shrink-0 rounded-xl bg-black/50 p-0.5 border border-white/15 overflow-hidden flex items-center justify-center ring-1',
                  playerRingColors[player.color] || 'ring-white/10'
                )}
              >
                <Image
                  src={PLAYER_DATA[player.color]?.sprite.idle || '/sprites/blue_idle.gif'}
                  alt={`${player.color} player`}
                  width={36}
                  height={36}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-default">
                      <span className="text-xs sm:text-sm font-extrabold truncate text-foreground tracking-tight">
                        {player.name}
                      </span>
                      {player.isBot && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-white/10 text-muted-foreground font-semibold">
                          BOT
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{player.name} ({player.color} commander)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Turn Countdown Badge */}
            <div className="flex items-center gap-1 shrink-0">
              {isCurrentPlayer && (
                <Badge
                  className={`text-[10px] sm:text-[11px] px-2 py-0.5 font-extrabold flex items-center gap-1 shadow-sm ${
                    turnTimer.isExpiring
                      ? 'bg-destructive text-destructive-foreground animate-pulse'
                      : 'bg-accent text-accent-foreground font-black'
                  }`}
                >
                  <span>TURN</span>
                  {isMyTurn && <span className="font-mono">{turnTimer.formattedTime}</span>}
                </Badge>
              )}
            </div>
          </div>

          {/* Victory Points Progress Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-yellow-400 font-bold">
                <Trophy className="h-3.5 w-3.5" />
                <span>Victory Points</span>
              </span>
              <span className="font-mono text-yellow-400 font-extrabold">
                {victoryPoints} / {vpGoal}
              </span>
            </div>
            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/10 relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                style={{ width: `${vpPercent}%` }}
              />
            </div>
          </div>

          {/* Stats Chips Row: Armies, Attack Power, Special Cards */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {/* Armies count + Positioned indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1 rounded-md bg-black/40 px-1.5 py-1 border border-white/10 text-[11px] font-semibold cursor-default">
                  <FightIcon className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span className="font-mono text-foreground font-bold">{armyCount}/5</span>
                  {positionedCount > 0 && (
                    <span className="text-[10px] text-amber-400 flex items-center">
                      <Anchor className="h-2.5 w-2.5 ml-0.5" />
                      {positionedCount}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Armies: {armyCount} on board (max 5)</p>
                {positionedCount > 0 && <p className="text-xs text-amber-300">{positionedCount} stationed & harvesting</p>}
              </TooltipContent>
            </Tooltip>

            {/* Attack Power */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1 rounded-md bg-black/40 px-1.5 py-1 border border-white/10 text-[11px] font-semibold cursor-default">
                  <Zap className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                  <span className="font-mono text-foreground font-bold">+{attackPower} AP</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attack Power: +{attackPower} bonus combat dice (max 4)</p>
              </TooltipContent>
            </Tooltip>

            {/* Special Cards in hand */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1 rounded-md bg-black/40 px-1.5 py-1 border border-white/10 text-[11px] font-semibold cursor-default">
                  <Album className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="font-mono text-foreground font-bold">{specialCardsCount}/3</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Special Cards: {specialCardsCount} in hand</p>
                {player.specialCards && player.specialCards.length > 0 && (
                  <p className="text-xs text-purple-300 mt-0.5">{player.specialCards.join(', ')}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Resources Breakdown Row (Food, Wood, Gold) */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { type: ResourceType.Food, label: 'Food', value: food },
              { type: ResourceType.Wood, label: 'Wood', value: wood },
              { type: ResourceType.Gold, label: 'Gold', value: gold },
            ]).map(({ type, label, value }) => (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between rounded-md bg-black/50 px-2 py-1 border border-white/10 shadow-sm cursor-default hover:bg-black/70 transition-colors">
                    <ResourceIcon type={type} className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono font-extrabold text-xs text-foreground">{value}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}: {value}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Active Buffs & Passive Abilities (rendered when present) */}
          {activeBuffs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-white/5">
              {activeBuffs.map(buff => (
                <Tooltip key={buff.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 flex items-center gap-1 bg-white/5 border-white/15 text-foreground hover:bg-white/10"
                    >
                      {buff.icon}
                      <span>{buff.label}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{buff.desc}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

