
import type { Island, Player, ResourceType, IslandResource, Army, Monster, DeathAnimation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ResourceIcon } from '@/components/icons';
import { Home, HelpCircle, Star, Loader2, Anchor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';
import { useState, useEffect } from 'react';
import { usePlayer } from '@/hooks/use-player';
import { IslandType, PlayerColor } from '@/lib/enums';

type IslandTileProps = {
  island: Island;
  players: Player[];
  onClick: (x: number, y: number) => void;
  isPossibleMove: boolean;
  isSelected: boolean;
  isCurrentPlayerTile: boolean;
  isArmySelectedOnTile: boolean;
  currentPlayerId: number;
  isTeleporting?: boolean;
  isScoutTarget?: boolean;
  deathAnimations: DeathAnimation[];
  fogOfWar: boolean;
  localPlayer: Player;
};

const playerColorMap: Record<PlayerColor, { bg: string, border: string }> = {
  [PlayerColor.Blue]: { bg: 'bg-blue-500', border: 'border-blue-300' },
  [PlayerColor.Red]: { bg: 'bg-red-500', border: 'border-red-300' },
  [PlayerColor.Purple]: { bg: 'bg-purple-500', border: 'border-purple-300' },
  [PlayerColor.Yellow]: { bg: 'bg-yellow-400', border: 'border-yellow-200' },
};

const playerTileIndicatorClasses: Record<string, string> = {
    [PlayerColor.Blue]: 'shadow-blue-500/50',
    [PlayerColor.Red]: 'shadow-red-500/50',
    [PlayerColor.Purple]: 'shadow-purple-500/50',
    [PlayerColor.Yellow]: 'shadow-yellow-400/50',
}

const AnimatedMonster = ({ monster }: { monster: Monster }) => {
    const [isAttacking, setIsAttacking] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [horizontalOffset, setHorizontalOffset] = useState(0);
    const [previousHorizontalOffset, setPreviousHorizontalOffset] = useState(0);

    useEffect(() => {
        const animationInterval = setInterval(() => {
            const currentlyAttacking = Math.random() < 0.2;
            setIsAttacking(currentlyAttacking);
            
            if (!currentlyAttacking) {
                const newOffset = (Math.random() - 0.5) * 40;

                if (newOffset > previousHorizontalOffset) {
                    setIsFlipped(false); // Moving right
                } else if (newOffset < previousHorizontalOffset) {
                    setIsFlipped(true); // Moving left
                }
                
                setPreviousHorizontalOffset(horizontalOffset);
                setHorizontalOffset(newOffset);
            }

        }, Math.random() * 1500 + 1000); // Random interval between 1-2.5 seconds

        return () => clearInterval(animationInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const spriteSrc = isAttacking ? monster.sprite.attack : monster.sprite.idle;
    const transform = `translateX(${horizontalOffset}%) ${isFlipped ? 'scaleX(-1)' : ''}`;

    return (
         <Tooltip>
            <TooltipTrigger asChild>
                <div className='relative h-full w-full flex items-center justify-center'>
                    <Image
                        src={spriteSrc}
                        alt={monster.name}
                        width={64}
                        height={64}
                        className="drop-shadow-lg transition-transform duration-1000 ease-in-out"
                        style={{ transform: isAttacking ? (isFlipped ? 'scaleX(-1)' : '') : transform }}
                    />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{monster.name} - Lvl: {monster.level}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export function IslandTile({ island, players, onClick, isPossibleMove, isSelected, isCurrentPlayerTile, isArmySelectedOnTile, currentPlayerId, isTeleporting, isScoutTarget, deathAnimations, fogOfWar, localPlayer }: IslandTileProps) {
  
  const occupants = island.occupants.map(o => {
      const player = players.find(p => p.id === o.playerId);
      const army = player?.armies.find(a => a.id === o.armyId);
      return { player, armyId: o.armyId, army };
  }).filter(o => o.player && o.army);

  const positionedBy = island.positionedBy || [];
  
  const currentPlayerOnTile = isCurrentPlayerTile ? players.find(p => p.id === currentPlayerId) : undefined;

  const baseOwner = island.type === IslandType.Base ? players.find(p => p.id === island.owner) : null;
  
  const deathAnimationOnTile = deathAnimations.find(anim => anim.x === island.x && anim.y === island.y);
  
  const isHiddenForPlayer = fogOfWar && localPlayer && !localPlayer.revealedTiles.includes(island.id);

  const renderResourceIcons = (resources: IslandResource[]) => {
    const isBase = island.type === IslandType.Base;
    return resources.map((resource, index) => {
        const positionInfo = positionedBy.find(p => p.resource === resource.type);
        const positionedPlayer = positionInfo ? players[positionInfo.playerId] : null;

        return (
            <div key={`resource-group-${index}`} className="flex flex-col items-center gap-1">
                <div className={cn("flex items-center justify-center gap-1", isBase ? 'flex-row' : '')}>
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
    if (!island.monsters || island.monsters.length === 0) return null;
    
    if (deathAnimationOnTile && deathAnimationOnTile.id.startsWith('monster-')) return null;

    return (
        <div className="flex h-full w-full flex-col">
            {island.monsters.map((monster, i) => (
                <div key={`${monster.name}-${i}`} className={cn("relative h-1/2 w-full", i === 0 ? 'justify-start' : 'justify-end')}>
                    <AnimatedMonster monster={monster} />
                </div>
            ))}
        </div>
    );
  }

  const getIcon = () => {
    if (isHiddenForPlayer) return <HelpCircle className="h-full w-full text-muted-foreground/50" />;
    
    switch (island.type) {
      case IslandType.Base: 
        return (
            <div className='relative h-full w-full'>
                {baseOwner?.color ? (
                    <Image 
                        src={PLAYER_DATA[baseOwner.color].base}
                        alt={`${baseOwner.color} base`}
                        width={64}
                        height={64}
                        className="p-1 h-full w-full object-contain"
                    />
                ) : <Home className="h-full w-full p-2" />}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end justify-center gap-4">
                    {renderResourceIcons(island.resources)}
                </div>
            </div>
        );
      case IslandType.Resource: 
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
            {renderResourceIcons(island.resources)}
          </div>
        );
      case IslandType.Monster: 
        return renderMonsterIcons();
      case IslandType.Special: return <Star className="h-full w-full text-yellow-400 p-2" />;
      default: return null;
    }
  };

  const getTerrainClass = () => {
    return 'bg-terrain bg-cover bg-center';
  }

  return (
    <TooltipProvider>
      <button
        onClick={() => onClick(island.x, island.y)}
        className={cn(
          'aspect-square w-full rounded-lg flex items-center justify-center relative transition-all duration-200 border-2',
          getTerrainClass(),
          isHiddenForPlayer ? 'border-dashed border-transparent' : 'border-transparent',
          isSelected ? 'ring-2 ring-primary' : '',
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
            {!isHiddenForPlayer && occupants.map(({ player, army }, index) => {
                if (!player || !army) return null;
                
                if (deathAnimations.some(anim => anim.id === `army-${player.id}-${army.id}`)) {
                    return null;
                }
                
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
                        key={`army-sprite-${player.id}-${army.id}`}
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
                        />
                    </div>
                )
            })}
        </div>
        
        {deathAnimationOnTile && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
                <Image
                    src={deathAnimationOnTile.sprite}
                    alt="Death animation"
                    width={64}
                    height={64}
                />
            </div>
        )}

        <div className="h-full w-full p-1">{getIcon()}</div>
      </button>
    </TooltipProvider>
  );
}
