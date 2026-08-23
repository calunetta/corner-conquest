'use client';

import React from 'react';
import type { GameState, GameSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Info, Loader2 } from 'lucide-react';

interface LobbyGameRowProps {
  game: GameState;
  isJoining: boolean;
  isAnyJoining: boolean;
  onJoin: (gameId: string) => void;
}

export const SettingsDisplay = ({ settings }: { settings: GameSettings }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Victory Point Goal</span>
      <span className="font-bold">{settings.victoryPointGoal}</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Fog of War</span>
      <span className="font-bold">{settings.fogOfWar ? 'Enabled' : 'Disabled'}</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Resource Density</span>
      <span className="font-bold">{Math.round(settings.resourceDensity * 100)}%</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">VP per Discovery</span>
      <span className="font-bold">{settings.vpPerIslandDiscovery}</span>
    </div>
    <Separator />
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Initial Deploy Cost</span>
      <span className="font-bold">{settings.initialDeployCost}</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Upgrade Cost</span>
      <span className="font-bold">{settings.upgradeCost}</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Ability Cost</span>
      <span className="font-bold">{settings.abilityCost}</span>
    </div>
    <Separator />
    <div>
      <h4 className="mb-2 text-sm font-medium text-muted-foreground">Available Cards</h4>
      <div className="flex flex-wrap gap-1">
        {settings.availableCards.map(card => (
          <Badge key={card} variant="secondary">
            {card}
          </Badge>
        ))}
      </div>
    </div>
    <div>
      <h4 className="mb-2 text-sm font-medium text-muted-foreground">Available Abilities</h4>
      <div className="flex flex-wrap gap-1">
        {settings.availableAbilities.map(ability => (
          <Badge key={ability} variant="secondary" className="capitalize">
            {ability}
          </Badge>
        ))}
      </div>
    </div>
  </div>
);

export function LobbyGameRow({ game, isJoining, isAnyJoining, onJoin }: LobbyGameRowProps) {
  const isFull = game.players.length >= game.maxPlayers;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-white/5 bg-black/20 p-3 transition-all duration-300 hover:bg-black/40 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:border-white/20 sm:p-4">
      <div className="flex flex-1 items-center gap-4 min-w-[200px]">
        <div className="flex -space-x-2">
          {game.players.map(p => (
            <Tooltip key={p.playerId}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2" style={{ borderColor: p.color }}>
                  <AvatarFallback style={{ backgroundColor: p.color }} className="text-white font-bold">
                    {p.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{p.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <h3 className="font-bold truncate">{game.name}</h3>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-yellow-500" />
          <span>{game.players[0]?.name || '...'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>
            {game.players.length} / {game.maxPlayers}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-2">
                <h3 className="font-bold text-lg">{game.name}</h3>
                <p className="text-sm text-muted-foreground">Match Settings</p>
                <Separator />
                <SettingsDisplay settings={game.settings} />
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <Button
          onClick={() => onJoin(game.id)}
          disabled={isAnyJoining || isFull}
          className="min-w-[80px]"
          variant={isFull ? 'secondary' : 'default'}
        >
          {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isFull ? 'Full' : 'Join'}
        </Button>
      </div>
    </div>
  );
}
