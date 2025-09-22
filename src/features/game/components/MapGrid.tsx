

import type { Island, Player, DeathAnimation } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { useMemo } from 'react';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import { MAP_COLS, MAP_ROWS } from '@/lib/types';


const ROCK_SPRITES = [
    '/sprites/small_rock.gif',
    '/sprites/mini_rock.gif',
    '/sprites/medium_rock.gif',
    '/sprites/big_rock.gif',
];

const generateDecorations = (isMobile: boolean, tileSize: number, gap: number) => {
    if (isMobile) return [];

    const decorations: { src: string; style: React.CSSProperties }[] = [];
    const totalGridWidth = (MAP_COLS * tileSize) + ((MAP_COLS - 1) * gap);
    const totalGridHeight = (MAP_ROWS * tileSize) + ((MAP_ROWS - 1) * gap);
    const numRocks = isMobile ? 0 : 50;

    let attempts = 0;
    while (decorations.length < numRocks && attempts < numRocks * 10) {
        attempts++;
        const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
        const size = Math.random() * 20 + 12;

        const isHorizontalGap = Math.random() > 0.5;
        let x, y;

        if (isHorizontalGap) {
            const col = Math.floor(Math.random() * (MAP_COLS - 1));
            const gapXStart = (col + 1) * tileSize + col * gap;
            x = gapXStart + Math.random() * gap;
            y = Math.random() * totalGridHeight;
        } else {
            const row = Math.floor(Math.random() * (MAP_ROWS - 1));
            const gapYStart = (row + 1) * tileSize + row * gap;
            x = Math.random() * totalGridWidth;
            y = gapYStart + Math.random() * gap;
        }

        if (x < size || y < size || x > totalGridWidth - size || y > totalGridHeight - size) {
            continue;
        }

        const style: React.CSSProperties = {
            position: 'absolute',
            zIndex: 5,
            pointerEvents: 'none',
            width: `${size}px`,
            height: `${size}px`,
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -50%)',
        };

        decorations.push({ src: rockSrc, style });
    }

    return decorations;
};

type MapGridProps = {
  map: Island[];
  players: Player[];
  onTileClick: (x: number, y: number) => void;
  possibleMoves: { x: number, y: number }[];
  selectedTile: { x: number, y: number } | null;
  isTeleporting?: boolean;
  isScouting?: boolean;
  deathAnimations: DeathAnimation[];
  fogOfWar: boolean;
  localPlayer: Player;
  globallyRevealedTiles: Set<string>;
  debugMode: boolean;
};

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, isTeleporting, isScouting, deathAnimations, fogOfWar, localPlayer, globallyRevealedTiles, debugMode }: MapGridProps) {
  
  const isMobile = useIsMobile();
  const tileSize = isMobile ? 75 : 120;
  const gap = isMobile ? 16 : 32;
  const decorations = useMemo(() => generateDecorations(isMobile, tileSize, gap), [isMobile, tileSize, gap]);

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
          gridTemplateColumns: `repeat(${MAP_COLS}, ${tileSize}px)`,
          gap: `${gap}px`,
          marginLeft: isMobile ? '180px' : '0',
        }}
      >
        {map.map((island) => {
          const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
          const isSelected = !!selectedTile && selectedTile.x === island.x && selectedTile.y === island.y;
          const isScoutTarget = isScouting && (debugMode ? false : fogOfWar && localPlayer && !localPlayer.revealedTiles.includes(island.id));
          
          return (
            <IslandTile
                key={island.id} 
                island={island}
                players={players}
                onClick={onTileClick}
                isPossibleMove={isPossible}
                isSelected={isSelected}
                isTeleporting={isTeleporting}
                isScoutTarget={isScoutTarget}
                deathAnimations={deathAnimations}
                fogOfWar={fogOfWar}
                localPlayer={localPlayer}
                globallyRevealedTiles={globallyRevealedTiles}
                debugMode={debugMode}
            />
          );
        })}
      </div>
    </div>
  );
}
