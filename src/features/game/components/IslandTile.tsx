'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Home, HelpCircle, Star } from 'lucide-react';
import type { Island } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PLAYER_DATA } from '@/modules/game-rules';
import { AnimatedMonster } from './AnimatedMonster';
import { TileForest } from './TileForest';
import { TileResources } from './TileResources';
import { TileBoats } from './TileBoats';
import { TileOccupants } from './TileOccupants';
import { DeathEffect, DEATH_ANIMATION_DURATION } from './DeathEffect';
import { useGameBoard } from '../context/GameBoardContext';

type IslandTileProps = {
  island: Island;
};

const BORDER_IMAGES = [
  '/sprites/island_edge_1.gif',
  '/sprites/island_edge_2.gif',
  '/sprites/island_edge_3.gif',
];

const playerTileIndicatorClasses: Record<string, string> = {
  blue: 'shadow-blue-500/50',
  red: 'shadow-red-500/50',
  purple: 'shadow-purple-500/50',
  yellow: 'shadow-yellow-400/50',
};

export const IslandTile = React.memo(function IslandTile({ island }: IslandTileProps) {
  const { gameState, localPlayer, uiState, selectedArmy, handleTileClick } = useGameBoard();
  const { players, deathAnimations, debugMode, settings } = gameState;
  const { possibleMoves, pendingAction, selectedArmyId } = uiState;
  const fogOfWar = settings.fogOfWar;

  const isTeleporting = pendingAction?.type === 'teleport';
  const isScouting = pendingAction?.type === 'scout';
  const isOpponentBase = island.type === IslandType.Base && island.owner !== localPlayer?.id;
  const isPossibleMove = isTeleporting
    ? selectedArmyId !== null && !isOpponentBase
    : possibleMoves.some(p => p.x === island.x && p.y === island.y);

  const isSelected = !!selectedArmy && selectedArmy.position.x === island.x && selectedArmy.position.y === island.y;

  const isScoutTarget = isScouting && (debugMode ? false : fogOfWar && localPlayer && !localPlayer.revealedTiles.includes(island.id));
  const isTeleportTarget = isTeleporting && !isOpponentBase && (!selectedArmy || !(selectedArmy.position.x === island.x && selectedArmy.position.y === island.y));

  const isBase = island.type === IslandType.Base;
  const baseOwner = isBase && island.owner !== undefined ? players.find(p => p.id === island.owner) : null;
  const now = Date.now();
  const deathAnimationOnTile = deathAnimations.find(
    anim => anim.x === island.x && anim.y === island.y && (!anim.createdAt || now - anim.createdAt < DEATH_ANIMATION_DURATION)
  );
  const isPersonallyRevealed = localPlayer ? localPlayer.revealedTiles.includes(island.id) : false;

  const isTileVisible = useMemo(() => {
    if (debugMode) return true;
    if (island.type === IslandType.Base) return true;
    if (fogOfWar) return isPersonallyRevealed;
    return players.some(p => p.revealedTiles.includes(island.id));
  }, [island.type, island.id, fogOfWar, isPersonallyRevealed, players, debugMode]);

  const tilePlayerColor = useMemo(() => {
    if (!isTileVisible || !localPlayer) return null;
    const occupantIds = new Set(island.occupants.map(o => o.playerId));
    if (occupantIds.size === 1) {
      const singlePlayerId = occupantIds.values().next().value;
      const singlePlayer = players.find(p => p.id === singlePlayerId);
      if (singlePlayer && singlePlayer.id === localPlayer.id) {
        return singlePlayer.color;
      }
    }
    return null;
  }, [island.occupants, players, isTileVisible, localPlayer]);

  const borderImageSequence = useMemo(() => {
    const middleImage = BORDER_IMAGES[Math.floor(Math.random() * BORDER_IMAGES.length)];
    return ['/sprites/island_edge_1.gif', middleImage, '/sprites/island_edge_2.gif'];
  }, []);

  const borderImageStyle: React.CSSProperties = {
    position: 'relative',
    width: '40px',
    height: '20px',
  };

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
  };

  const getTileCenterContent = () => {
    if (!isTileVisible) return <HelpCircle className="h-full w-full text-muted-foreground/50" />;

    switch (island.type) {
      case IslandType.Base:
        return (
          <div className="relative h-full w-full flex items-center justify-center">
            {baseOwner?.color ? (
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]">
                <Image
                  src={PLAYER_DATA[baseOwner.color].base}
                  alt={`${baseOwner.color} base`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <Home className="h-full w-full p-2 text-muted-foreground" />
            )}
            {/* Top Base Resources Capsule */}
            <TileResources island={island} isBase={true} />
          </div>
        );
      case IslandType.Monster:
        return renderMonsterIcons();
      case IslandType.Special:
        return <Star className="h-full w-full text-yellow-400 p-2 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />;
      case IslandType.Resource:
        return <TileResources island={island} isBase={false} />;
      case IslandType.Empty:
      default:
        return null;
    }
  };

  const isClickable =
    isPossibleMove ||
    isScoutTarget ||
    isTeleportTarget ||
    (localPlayer && island.occupants && island.occupants.some(o => o.playerId === localPlayer.id));

  return (
    <TooltipProvider>
      <button
        onClick={() => handleTileClick(island.x, island.y)}
        className={cn(
          'aspect-square w-full rounded-lg flex items-center justify-center relative transition-all duration-300 border-2 shadow-[0_10px_20px_rgba(0,0,0,0.6)]',
          isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]' : 'cursor-default',
          isSelected ? 'border-primary shadow-[0_0_30px_rgba(var(--primary),0.8)]' : 'border-transparent',
          isPossibleMove && 'border-accent/80 shadow-[0_0_20px_rgba(var(--accent),0.6)]',
          isTeleportTarget && 'border-purple-500/50 shadow-lg shadow-purple-500/40',
          isScoutTarget && 'border-blue-500/50 shadow-lg shadow-blue-500/40',
          tilePlayerColor && !isSelected && `shadow-lg ${playerTileIndicatorClasses[tilePlayerColor]}`,
          isClickable && !isSelected && !isPossibleMove && 'hover:border-foreground/50'
        )}
        aria-label={`Island at ${island.x}, ${island.y}`}
        data-testid={`island-tile-${island.x}-${island.y}`}
      >
        {/* Terrain Background Canvas */}
        <div className="absolute inset-0 z-10 bg-terrain bg-cover bg-center bg-no-repeat rounded-lg" />

        {/* Death Animation */}
        {deathAnimationOnTile && (
          <DeathEffect
            sprite={deathAnimationOnTile.sprite}
            id={deathAnimationOnTile.id}
            createdAt={deathAnimationOnTile.createdAt}
          />
        )}

        {/* Deterministic Tree Cluster / Small Forest */}
        {isTileVisible && <TileForest island={island} isBase={isBase} />}

        {/* Corner Boats & Idle Collectors */}
        <TileBoats island={island} />

        {/* Center Tile Feature / Monster / Castle / Resource Showcase */}
        <div className={cn('h-full w-full p-1 z-20', !isTileVisible ? 'bg-transparent' : 'bg-transparent')}>
          {getTileCenterContent()}
        </div>

        {/* Landed Army Occupants */}
        <TileOccupants island={island} />

        {/* Bottom Coastline Water Edges */}
        <div className="pointer-events-none absolute -bottom-[11px] left-1/2 -translate-x-1/2 z-0 flex w-full justify-center">
          {borderImageSequence.map((src, index) => (
            <div key={index} style={borderImageStyle}>
              <Image src={src} alt="" fill className="object-contain" unoptimized />
            </div>
          ))}
        </div>
      </button>
    </TooltipProvider>
  );
});
