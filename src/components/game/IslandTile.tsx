

import type { Island, Player, GameAction, ResourceType, IslandResource, Army } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ResourceIcon, MonsterIcon } from '../icons';
import { Home, HelpCircle, Star, Loader2, Anchor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Image from 'next/image';
import { PLAYER_SPRITES } from '@/lib/player-data';

type IslandTileProps = {
  island: Island;
  players: Player[];
  onClick: (x: number, y: number) => void;
  isPossibleMove: boolean;
  isSelected: boolean;
  isCurrentPlayerTile: boolean;
  isArmySelectedOnTile: boolean;
  isTeleporting?: boolean;
  isScoutTarget?: boolean;
};

const playerColorMap = {
  blue: { bg: 'bg-blue-500', border: 'border-blue-300' },
  red: { bg: 'bg-red-500', border: 'border-red-300' },
  purple: { bg: 'bg-purple-500', border: 'border-purple-300' },
  yellow: { bg: 'bg-yellow-400', border: 'border-yellow-200' },
};

const playerTileIndicatorClasses: Record<string, string> = {
    blue: 'shadow-blue-500/50',
    red: 'shadow-red-500/50',
    purple: 'shadow-purple-500/50',
    yellow: 'shadow-yellow-400/50',
}

const armyPositions = [
    'top-1 left-1',
    'top-1 right-1',
    'bottom-1 right-1',
    'bottom-1 left-1',
    'top-1/2 left-1 -translate-y-1/2',
    'top-1 left-1/2 -translate-x-1/2',
    'bottom-1 left-1/2 -translate-x-1/2',
    'top-1/2 right-1 -translate-y-1/2',
];

export function IslandTile({ island, players, onClick, isPossibleMove, isSelected, isCurrentPlayerTile, isArmySelectedOnTile, isTeleporting, isScoutTarget }: IslandTileProps) {
  const occupants = island.occupants.map(o => {
      const player = players.find(p => p.id === o.playerId);
      const army = player?.armies.find(a => a.id === o.armyId);
      return { player, armyId: o.armyId, army };
  }).filter(o => o.player && o.army);

  const positionedBy = island.positionedBy || [];
  
  const currentPlayerOnTile = players.find(p => p.id === (isCurrentPlayerTile ? occupants.find(o => players[o.player!.id].armies.some(a => a.position.x === island.x && a.position.y === island.y))?.player!.id : -1));

  const baseOwner = island.type === 'base' ? players.find(p => p.id === island.owner) : null;

  const renderResourceIcons = (resources: IslandResource[]) => {
    return resources.map((resource, index) => {
        const positionInfo = positionedBy.find(p => p.resource === resource.type);
        const positionedPlayer = positionInfo ? players[positionInfo.playerId] : null;

        return (
            <div key={`resource-group-${index}`} className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-1">
                    {Array.from({ length: resource.amount }).map((_, i) => (
                        <ResourceIcon key={`${resource.type}-${i}`} type={resource.type} className="h-4 w-4 text-accent" />
                    ))}
                </div>
                 {positionedPlayer && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="mt-0.5 flex items-center justify-center gap-1">
                                {Array.from({ length: resource.amount }).map((_, i) => (
                                    <div key={`dot-${i}`} className={cn('h-1.5 w-1.5 rounded-full', playerColorMap[positionedPlayer.color].bg)} />
                                ))}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Positioned by {positionedPlayer.name}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        );
    });
  }

  const renderMonsterIcons = () => {
    if (!island.monsters) return null;
    return island.monsters.map((monster, i) => (
      <div key={`monster-row-${i}`} className="flex w-full items-center justify-between px-1">
        <MonsterIcon level={monster.level} className="h-5 w-5" />
        <span className="text-xs font-bold text-destructive">Lvl: {monster.level}</span>
      </div>
    ));
  }

  const getIcon = () => {
    if (island.isHidden) return <HelpCircle className="h-full w-full text-muted-foreground/50" />;
    
    switch (island.type) {
      case 'base': 
        return <Home className="h-full w-full p-2" style={{ color: baseOwner?.color }}/>;
      case 'resource': 
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
            {renderResourceIcons(island.resources)}
          </div>
        );
      case 'monster': 
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
            {renderMonsterIcons()}
          </div>
        );
      case 'special': return <Star className="h-full w-full text-yellow-400 p-2" />;
      default: return null;
    }
  };

  return (
    <TooltipProvider>
      <button
        onClick={() => onClick(island.x, island.y)}
        className={cn(
          'aspect-square w-full rounded-lg border-2 flex items-center justify-center relative transition-all duration-200',
          island.isHidden ? 'bg-muted/30 border-dashed' : 'bg-card',
          isSelected ? 'border-primary ring-2 ring-primary' : '',
          isPossibleMove ? 'border-accent/70 hover:border-accent shadow-lg shadow-accent/20' : 'hover:border-foreground/50',
          isCurrentPlayerTile && currentPlayerOnTile ? `shadow-lg ${playerTileIndicatorClasses[currentPlayerOnTile.color]}`: '',
          isArmySelectedOnTile && !isTeleporting && 'ring-2 ring-offset-2 ring-primary',
          isArmySelectedOnTile && isTeleporting && 'ring-2 ring-offset-2 ring-purple-500',
          isTeleporting && isPossibleMove && 'border-purple-500 hover:border-purple-400 shadow-lg shadow-purple-500/30',
          isScoutTarget && 'cursor-pointer border-blue-400 hover:border-blue-300 shadow-lg shadow-blue-500/30'
        )}
        aria-label={`Island at ${island.x}, ${island.y}`}
      >
        <div className="absolute inset-0 z-10 grid grid-cols-2 grid-rows-2">
            {occupants.map(({ player, army }, index) => {
                if (!player || !army) return null;
                
                const sprite = PLAYER_SPRITES[player.color];
                if (!sprite) return null;
                
                // Simple grid positioning for up to 4 armies
                const positionClasses = [
                    'top-0 left-0', 
                    'top-0 right-0', 
                    'bottom-0 left-0', 
                    'bottom-0 right-0'
                ];

                return (
                    <div key={`${player.id}-${army.id}`} className={cn('absolute h-1/2 w-1/2', positionClasses[index % 4])}>
                        <Image
                            src={sprite.idle}
                            alt={`${player.color} army`}
                            width={24}
                            height={24}
                            className={cn(
                                "absolute bottom-0 right-0 h-auto w-full max-w-[24px] origin-bottom-right drop-shadow-lg",
                                army.hasActed ? 'opacity-50' : ''
                            )}
                        />
                    </div>
                )
            })}
        </div>
        
        <div className="h-full w-full p-1">{getIcon()}</div>
      </button>
    </TooltipProvider>
  );
}
