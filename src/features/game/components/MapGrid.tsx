
import type { Island, Player, DeathAnimation } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MAP_COLS, MAP_ROWS } from '@/lib/game-logic';


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

        // Place rocks only in the gaps
        const isHorizontalGap = Math.random() > 0.5;
        let x, y;

        if (isHorizontalGap) {
            // Place in a vertical gap column
            const col = Math.floor(Math.random() * (MAP_COLS - 1));
            const gapXStart = (col + 1) * tileSize + col * gap;
            x = gapXStart + Math.random() * gap;
            y = Math.random() * totalGridHeight;
        } else {
            // Place in a horizontal gap row
            const row = Math.floor(Math.random() * (MAP_ROWS - 1));
            const gapYStart = (row + 1) * tileSize + row * gap;
            x = Math.random() * totalGridWidth;
            y = gapYStart + Math.random() * gap;
        }

        // Final check to ensure it's not too close to the edge of the grid
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
  currentPlayerId: number;
  selectedArmyId: number | null;
  isTeleporting?: boolean;
  isScouting?: boolean;
  deathAnimations: DeathAnimation[];
  fogOfWar: boolean;
  localPlayer: Player;
  globallyRevealedTiles: Set<string>;
};

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, currentPlayerId, selectedArmyId, isTeleporting, isScouting, deathAnimations, fogOfWar, localPlayer, globallyRevealedTiles }: MapGridProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const selectedArmy = selectedArmyId !== null && currentPlayer ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const teleportingArmyId = isTeleporting && players[currentPlayerId]?.teleportState?.armyId !== null ? players[currentPlayerId]?.teleportState?.armyId : null;
  
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
                globallyRevealedTiles={globallyRevealedTiles}
            />
          );
        })}
      </div>
    </div>
  );
}
