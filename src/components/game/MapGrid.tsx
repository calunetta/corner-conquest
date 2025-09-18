

import type { Island, Player, GameAction } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { useMemo } from 'react';
import Image from 'next/image';

const ROCK_SPRITES = [
    '/sprites/small_rock.gif',
    '/sprites/mini_rock.gif',
    '/sprites/medium_rock.gif',
    '/sprites/big_rock.gif',
];

const TILE_SIZE = 128; // Fixed size for each island tile in pixels
const TILE_GAP = 32;   // Fixed gap between island tiles in pixels

const generateDecorations = (map: Island[][]) => {
    const decorations: { src: string; x: number; y: number; size: number, style: React.CSSProperties }[] = [];
    const mapSize = map.length;

    map.flat().forEach(island => {
        const rockCount = 1 + Math.floor(Math.random() * 3); // 1 to 3 rocks per island
        
        let possibleSides = [0, 1, 2, 3]; // 0: top, 1: right, 2: bottom, 3: left
        if (island.y === 0) possibleSides = possibleSides.filter(s => s !== 0);
        if (island.x === mapSize - 1) possibleSides = possibleSides.filter(s => s !== 1);
        if (island.y === mapSize - 1) possibleSides = possibleSides.filter(s => s !== 2);
        if (island.x === 0) possibleSides = possibleSides.filter(s => s !== 3);


        for (let i = 0; i < rockCount; i++) {
            if (possibleSides.length === 0) break;

            const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
            
            // Allow rocks to cluster by not removing the side after selection
            const side = possibleSides[Math.floor(Math.random() * possibleSides.length)];

            const offset = (Math.random() - 0.5) * 50; // -25% to +25% offset along the side
            const size = Math.random() * 20 + 12; // Random size between 12px and 32px

            let style: React.CSSProperties = {
                position: 'absolute',
                zIndex: 5,
                pointerEvents: 'none',
                width: `${size}px`,
                height: `${size}px`,
            };

            switch(side) {
                case 0: // Top
                    style.top = '-25%';
                    style.left = `${50 + offset}%`;
                    style.transform = 'translateX(-50%)';
                    break;
                case 1: // Right
                    style.top = `${50 + offset}%`;
                    style.right = '-25%';
                    style.transform = 'translateY(-50%)';
                    break;
                case 2: // Bottom
                    style.bottom = '-25%';
                    style.left = `${50 + offset}%`;
                    style.transform = 'translateX(-50%)';
                    break;
                case 3: // Left
                    style.top = `${50 + offset}%`;
                    style.left = '-25%';
                    style.transform = 'translateY(-50%)';
                    break;
            }

            decorations.push({
                src: rockSrc,
                x: island.x,
                y: island.y,
                size: 24,
                style,
            });
        }
    });

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
  zoom: number;
  pan: { x: number; y: number };
};

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, currentPlayerId, selectedArmyId, isTeleporting, isScouting, zoom, pan }: MapGridProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const selectedArmy = selectedArmyId !== null && currentPlayer ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const teleportingArmyId = isTeleporting && players[currentPlayerId]?.teleportState?.armyId !== null ? players[currentPlayerId]?.teleportState?.armyId : null;

  const decorations = useMemo(() => {
    if (!map || map.length === 0) return [];
    return generateDecorations(map);
  }, []);

  const totalSize = TILE_SIZE + TILE_GAP;

  return (
    <div
      className="absolute"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {map.flat().map((island) => {
        const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
        const isSelected = selectedTile?.x === island.x && selectedTile?.y === island.y;
        const isCurrentPlayerTile = island.occupants.some(o => o.playerId === currentPlayerId);
        
        const armyOnTile = island.occupants.find(o => o.playerId === currentPlayerId);
        const isArmySelectedOnTile = (isTeleporting && armyOnTile?.armyId === teleportingArmyId) || (!isTeleporting && selectedArmy?.position.x === island.x && selectedArmy?.position.y === island.y);
        
        const isScoutTarget = isScouting && island.isHidden;
        
        const islandDecorations = decorations.filter(d => d.x === island.x && d.y === island.y);

        return (
          <div 
            key={island.id} 
            className="absolute z-10"
            style={{
              width: `${TILE_SIZE}px`,
              height: `${TILE_SIZE}px`,
              left: `${island.x * totalSize}px`,
              top: `${island.y * totalSize}px`,
            }}
          >
            {islandDecorations.map((deco, index) => (
              <Image
                key={index}
                src={deco.src}
                alt="decorative rock"
                width={deco.size}
                height={deco.size}
                style={deco.style}
                unoptimized
              />
            ))}
            <IslandTile
                island={island}
                players={players}
                onClick={onTileClick}
                isPossibleMove={isPossible}
                isSelected={isSelected}
                isCurrentPlayerTile={isCurrentPlayerTile}
                isArmySelectedOnTile={!!isArmySelectedOnTile}
                isTeleporting={isTeleporting}
                isScoutTarget={isScoutTarget}
            />
          </div>
        );
      })}
    </div>
  );
}

    