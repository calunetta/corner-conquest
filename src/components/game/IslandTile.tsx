

import type { Island, Player, GameAction, ResourceType, IslandResource, Army } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ResourceIcon, MonsterIcon } from '../icons';
import { Home, HelpCircle, Star, Loader2, Anchor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';

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
        return baseOwner?.color ? (
            <Image 
                src={PLAYER_DATA[baseOwner.color].base}
                alt={`${baseOwner.color} base`}
                width={64}
                height={64}
                className="h-full w-full object-contain p-1"
                unoptimized
            />
        ) : <Home className="h-full w-full p-2" />;
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

  const getTerrainClass = () => {
    if (island.isHidden) return 'bg-muted/30 border-dashed';
    
    return 'bg-terrain bg-cover bg-center';
  }

  return (
    <TooltipProvider>
      <button
        onClick={() => onClick(island.x, island.y)}
        className={cn(
          'aspect-square w-full rounded-lg border-2 flex items-center justify-center relative transition-all duration-200',
          getTerrainClass(),
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
        <div className="absolute inset-0 z-10">
            {occupants.map(({ player, army }, index) => {
                if (!player || !army) return null;
                
                const sprite = PLAYER_DATA[player.color].sprite;
                if (!sprite) return null;
                
                const positions = [
                    { bottom: '0', left: '0', origin: 'origin-bottom-left' },
                    { bottom: '0', right: '0', origin: 'origin-bottom-right' },
                    { top: '0', left: '0', origin: 'origin-top-left' },
                    { top: '0', right: '0', origin: 'origin-top-right' }
                ];
                const pos = positions[index % 4];

                return (
                    <div 
                        key={`${player.id}-${army.id}`} 
                        className={cn('absolute w-1/2 h-1/2', pos.origin)}
                        style={{ top: pos.top, left: pos.left, right: pos.right, bottom: pos.bottom }}
                    >
                        <Image
                            src={sprite.idle}
                            alt={`${player.color} army`}
                            width={64}
                            height={64}
                            className={cn(
                                "absolute h-auto w-full max-w-[86px] drop-shadow-lg",
                                'bottom-0 right-0', 
                                pos.origin.includes('top') && 'top-0',
                                pos.origin.includes('bottom') && 'bottom-0',
                                pos.origin.includes('left') && 'left-0',
                                pos.origin.includes('right') && 'right-0',
                                army.hasActed ? 'opacity-50' : ''
                            )}
                            unoptimized
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
