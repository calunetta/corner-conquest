
'use client';
import type { Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceIcon } from '@/components/icons';
import { Award, Swords, Zap, Album, Forward, Ban } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';

type PlayerInfoProps = {
  player: Player;
  isCurrentPlayer: boolean;
};

export function PlayerInfo({ player, isCurrentPlayer }: PlayerInfoProps) {
  return (
    <TooltipProvider>
      <Card className={`transition-all duration-300 ${isCurrentPlayer ? `border-accent shadow-lg shadow-accent/20` : ''}`}>
        <CardHeader className="flex-row items-center justify-between space-y-0 p-2">
          <div className="flex items-center gap-2">
            <Image 
                src={PLAYER_DATA[player.color].sprite.idle}
                alt={`${player.color} army`}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
                unoptimized
                priority
            />
            <CardTitle className="text-sm font-medium">{player.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {player.isSabotaged && (
                <Tooltip>
                    <TooltipTrigger>
                         <Badge variant="destructive" className="flex items-center gap-1">
                            <Ban className="h-3 w-3" /> Sabotaged
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>This player will miss their next turn!</p>
                    </TooltipContent>
                </Tooltip>
            )}
            {player.hasExtraMove && (
                <Tooltip>
                    <TooltipTrigger>
                        <Forward className="h-4 w-4 text-accent animate-pulse" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Extra Move active!</p>
                    </TooltipContent>
                </Tooltip>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-y-2 p-2 pt-0">
          <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-bold">{player.victoryPoints}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Victory Points</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                      <Swords className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-bold">{player.armies ? player.armies.length : player.armyCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Army Count ({player.armies ? player.armies.length : player.armyCount}/5)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-bold">{player.attackPower}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attack Power (Rolls {player.attackPower + 1} dice in combat)</p>
                </TooltipContent>
              </Tooltip>
          </div>
          <div className="flex flex-wrap justify-end gap-2 text-xs">
            {Object.entries(player.resources).map(([type, value]) => (
                <Tooltip key={type}>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
                            <ResourceIcon type={type as keyof Player['resources']} className="h-3 w-3 text-muted-foreground" />
                            <span className="font-semibold">{value}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className='capitalize'>{type}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
             <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
                        <Album className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold">{player.specialCards.length}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Special Cards</p>
                </TooltipContent>
             </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
