
import type { Island, Player, DeathAnimation } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { useMemo } from 'react';
import Image from 'next/image';
import { TILE_GAP, TILE_SIZE, MAP_COLS, MAP_ROWS } from '@/lib/game-logic';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const ROCK_SPRITES = [
    '/sprites/small_rock.gif',
    '/sprites/mini_rock.gif',
    '/sprites/medium_rock.gif',
    '/sprites/big_rock.gif',
];

const generateDecorations = (isMobile: boolean) => {
    if (isMobile) return [];

    const decorations: { src: string; style: React.CSSProperties }[] = [];
    const totalGridWidth = (MAP_COLS * TILE_SIZE) + ((MAP_COLS) * TILE_GAP);
    const totalGridHeight = (MAP_ROWS * TILE_SIZE) + ((MAP_ROWS) * TILE_GAP);

    const isOverIsland = (x: number, y: number) => {
        const col = Math.floor(x / (TILE_SIZE + TILE_GAP));
        const row = Math.floor(y / (TILE_SIZE + TILE_GAP));

        const xInCol = x % (TILE_SIZE + TILE_GAP);
        const yInRow = y % (TILE_SIZE + TILE_GAP);

        return xInCol < TILE_SIZE && yInRow < TILE_SIZE;
    };

    const rockCount = isMobile ? 0 : 50;
    let attempts = 0;

    while (decorations.length < rockCount && attempts < rockCount * 10) {
        const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
        const size = Math.random() * 20 + 12;

        const posX = Math.random() * totalGridWidth;
        const posY = Math.random() * totalGridHeight;
        
        attempts++;
        if (isOverIsland(posX, posY)) {
            continue; // Skip if it's over an island
        }

        const style: React.CSSProperties = {
            position: 'absolute',
            zIndex: 5,
            pointerEvents: 'none',
            width: `${size}px`,
            height: `${size}px`,
            left: `${posX}px`,
            top: `${posY}px`,
            transform: 'translate(-50%, -50%)'
        };

        decorations.push({ src: rockSrc, style });
    }
    
    return decorations;
};

type MapGridProps = {
  map: Island[][];
  players: Player[];
  onTileClick: (x: number, y: number) => void;
  possibleMoves: { x: number, y: number }[];
  selectedTile: { x: number, y: number } | null;
  currentPlayerId: number;
  selectedArmyId: number | null;
  isTeleporting?: boolean;
  isScouting?: boolean;
  deathAnimations: DeathAnimation[];
  fogOfWar: boolean;
  localPlayer: Player;
};

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, currentPlayerId, selectedArmyId, isTeleporting, isScouting, deathAnimations, fogOfWar, localPlayer }: MapGridProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const selectedArmy = selectedArmyId !== null && currentPlayer ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const teleportingArmyId = isTeleporting && players[currentPlayerId]?.teleportState?.armyId !== null ? players[currentPlayerId]?.teleportState?.armyId : null;
  
  const isMobile = useIsMobile();
  const decorations = useMemo(() => generateDecorations(isMobile), [isMobile]);

  if (!map || map.length === 0) return null;

  return (
    <div
      className="relative bg-water-pattern bg-repeat p-8 rounded-xl shadow-lg"
    >
      {!isMobile && decorations.map((deco, index) => (
            <Image
                key={`deco-${index}`}
                src={deco.src}
                alt="decorative rock"
                width={20}
                height={20}
                style={deco.style}
                unoptimized
            />
      ))}
      <div 
        className="grid z-10 relative"
        style={{
          gridTemplateColumns: `repeat(${MAP_COLS}, ${TILE_SIZE}px)`,
          gap: `${TILE_GAP}px`,
          marginLeft: isMobile ? '180px' : '0',
        }}
      >
        {map.flat().filter(island => !!island).map((island) => {
          const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
          const isSelected = !!selectedTile && selectedTile.x === island.x && selectedTile.y === island.y;
          const isCurrentPlayerTile = island.occupants.some(o => o.playerId === currentPlayerId);
          
          const armyOnTile = island.occupants.find(o => o.playerId === currentPlayerId);
          const isArmySelectedOnTile = (isTeleporting && armyOnTile?.armyId === teleportingArmyId) || (!isTeleporting && selectedArmy?.position.x === island.x && selectedArmy?.position.y === island.y);
          
          const isScoutTarget = isScouting && fogOfWar && localPlayer && !localPlayer.revealedTiles.includes(island.id);
          
          return (
            <IslandTile
                key={island.id} 
                island={island}
                players={players}
                onClick={onTileClick}
                isPossibleMove={isPossible}
                isSelected={isSelected}
                isCurrentPlayerTile={isCurrentPlayerTile}
                isArmySelectedOnTile={!!isArmySelectedOnTile}
                currentPlayerId={currentPlayerId}
                isTeleporting={isTeleporting}
                isScoutTarget={isScoutTarget}
                deathAnimations={deathAnimations}
                fogOfWar={fogOfWar}
                localPlayer={localPlayer}
            />
          );
        })}
      </div>
    </div>
  );
}
