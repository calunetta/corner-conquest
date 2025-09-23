
import type { Island, Player, ResourceType, IslandResource, Army, Monster, DeathAnimation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ResourceIcon } from '@/components/icons';
import { Home, HelpCircle, Star, Loader2, Anchor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { PLAYER_DATA } from '@/lib/player-data';
import { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '@/hooks/use-player';
import { IslandType, PlayerColor } from '@/lib/types';

type IslandTileProps = {
  island: Island;
  players: Player[];
  onClick: (x: number, y: number) => void;
  isPossibleMove: boolean;
  isSelected: boolean;
  isTeleporting?: boolean;
  isScoutTarget?: boolean;
  deathAnimations: DeathAnimation[];
  fogOfWar: boolean;
  localPlayer: Player;
  globallyRevealedTiles: Set<string>;
  debugMode: boolean;
};

const BORDER_IMAGES = [
  '/sprites/island_edge_1.gif',
  '/sprites/island_edge_2.gif',
  '/sprites/island_edge_3.gif',
];

const playerColorMap: Record<PlayerColor, { bg: string, border: string }> = {
  [PlayerColor.Blue]: { bg: 'bg-blue-500', border: 'border-blue-300' },
  [PlayerColor.Red]: { bg: 'bg-red-500', border: 'border-red-300' },
  [PlayerColor.Purple]: { bg: 'bg-purple-500', border: 'border-purple-300' },
  [PlayerColor.Yellow]: { bg: 'bg-yellow-400', border: 'border-yellow-200' },
};

const playerTileIndicatorClasses: Record<string, string> = {
    'blue': 'shadow-blue-500/50',
    'red': 'shadow-red-500/50',
    'purple': 'shadow-purple-500/50',
    'yellow': 'shadow-yellow-400/50',
};


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
                        unoptimized
                    />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{monster.name} - Lvl: {monster.level}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export function IslandTile({ island, players, onClick, isPossibleMove, isSelected, isTeleporting, isScoutTarget, deathAnimations, fogOfWar, localPlayer, globallyRevealedTiles, debugMode }: IslandTileProps) {
  
  const occupants = island.occupants.map(o => {
      const player = players.find(p => p.id === o.playerId);
      const army = player?.armies.find(a => a.id === o.armyId);
      return { player, armyId: o.armyId, army };
  }).filter(o => o.player && o.army);

  const positionedBy = island.positionedBy || [];
  
  const baseOwner = island.type === IslandType.Base ? players.find(p => p.id === island.owner) : null;
  
  const deathAnimationOnTile = deathAnimations.find(anim => anim.x === island.x && anim.y === island.y);
  
  const isPersonallyRevealed = localPlayer.revealedTiles.includes(island.id);

  const isTileVisible = useMemo(() => {
    if (debugMode) return true;
    if (island.type === IslandType.Base) return true;
    if (fogOfWar) {
      return isPersonallyRevealed;
    }
    // If fog of war is disabled, tile is visible if ANYONE has revealed it.
    return globallyRevealedTiles.has(island.id);
  }, [island.type, island.id, fogOfWar, isPersonallyRevealed, globallyRevealedTiles, debugMode]);

  const tilePlayerColor = useMemo(() => {
    if (!isTileVisible) return null;
    const occupantIds = new Set(island.occupants.map(o => o.playerId));
    if (occupantIds.size === 1) {
        const singlePlayerId = occupantIds.values().next().value;
        const singlePlayer = players.find(p => p.id === singlePlayerId);
        // Only show indicator for the local player's armies
        if (singlePlayer && singlePlayer.id === localPlayer.id) {
            return singlePlayer.color;
        }
    }
    return null;
  }, [island.occupants, players, isTileVisible, localPlayer.id]);
  
  const borderImageSequence = useMemo(() => {
    const middleImage = BORDER_IMAGES[Math.floor(Math.random() * BORDER_IMAGES.length)];
    return [
      '/sprites/island_edge_1.gif',
      middleImage,
      '/sprites/island_edge_2.gif',
    ];
  }, []);

  const borderImageStyle: React.CSSProperties = {
      position: 'relative',
      width: '40px',
      height: '20px',
  };


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
    if (!isTileVisible) return <HelpCircle className="h-full w-full text-muted-foreground/50" />;
    
    switch (island.type) {
      case IslandType.Base: 
        return (
            <div className='relative h-full w-full'>
                {baseOwner?.color ? (
                    <Image 
                        src={PLAYER_DATA[baseOwner.color].base}
                        alt={`${baseOwner.color} base`}
                        fill
                        className="p-1 h-full w-full object-contain"
                        unoptimized
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

  return (
    <TooltipProvider>
      <button
        onClick={() => onClick(island.x, island.y)}
        className={cn(
          'aspect-square w-full rounded-lg flex items-center justify-center relative transition-all duration-200 border-2',
          isSelected ? 'border-primary shadow-2xl shadow-primary/80' : 'border-transparent',
          isPossibleMove && 'border-accent/50 shadow-lg shadow-accent/40',
          isTeleporting && 'border-purple-500/50 shadow-lg shadow-purple-500/40',
          isScoutTarget && 'cursor-pointer border-blue-500/50 shadow-lg shadow-blue-500/40',
          tilePlayerColor && !isSelected && `shadow-lg ${playerTileIndicatorClasses[tilePlayerColor]}`,
           'hover:border-foreground/50'
        )}
        aria-label={`Island at ${island.x}, ${island.y}`}
      >
        <div className="absolute inset-0 z-10 bg-terrain bg-cover bg-center bg-no-repeat" />
        
        {deathAnimationOnTile && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
                <Image
                    src={deathAnimationOnTile.sprite}
                    alt="Death animation"
                    width={64}
                    height={64}
                    unoptimized
                />
            </div>
        )}

        <div className={cn("h-full w-full p-1 z-20", !isTileVisible ? 'bg-transparent' : 'bg-transparent')}>
          {getIcon()}
        </div>

        <div className="absolute inset-0 z-30 pointer-events-none">
            {occupants.map(({ player, army }, index) => {
                if (!player || !army) return null;

                if (deathAnimations.some(anim => anim.id === `army-${player.id}-${army.id}`)) {
                    return null;
                }
                
                let isArmyVisible;
                if (debugMode) {
                    isArmyVisible = true;
                } else if (fogOfWar) {
                    // With fog, own armies are visible. Opponent armies are visible on bases or personally revealed tiles.
                    isArmyVisible = player.id === localPlayer.id || island.type === IslandType.Base || isPersonallyRevealed;
                } else {
                    // Without fog, all armies are always visible.
                    isArmyVisible = true;
                }

                if (!isArmyVisible) {
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
                            unoptimized
                        />
                    </div>
                )
            })}
        </div>
        
        <div className="pointer-events-none absolute -bottom-[11px] left-1/2 -translate-x-1/2 z-0 flex w-full justify-center">
          {borderImageSequence.map((src, index) => (
            <div key={index} style={borderImageStyle}>
              <Image
                  src={src}
                  alt=""
                  layout="fill"
                  objectFit="contain"
                  unoptimized
              />
            </div>
          ))}
        </div>
      </button>
    </TooltipProvider>
  );
}
