

import type { Island, Player, GameAction } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { useMemo } from 'react';
import Image from 'next/image';
import { TILE_GAP, TILE_SIZE } from '@/lib/game-logic';

const ROCK_SPRITES = [
    '/sprites/small_rock.gif',
    '/sprites/mini_rock.gif',
    '/sprites/medium_rock.gif',
    '/sprites/big_rock.gif',
];

const generateDecorations = (map: Island[][]) => {
    const decorations: { src: string; x: number; y: number; size: number, style: React.CSSProperties }[] = [];
    if (!map || map.length === 0) return [];
    const mapSize = map.length;

    // Generate rocks around islands
    map.flat().forEach(island => {
        const rockCount = 1 + Math.floor(Math.random() * 3); // 1 to 3 rocks per island
        
        let possibleSides = [0, 1, 2, 3]; // 0: top, 1: right, 2: bottom, 3: left

        for (let i = 0; i < rockCount; i++) {
            const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
            const side = possibleSides[Math.floor(Math.random() * possibleSides.length)];

            const offset = (Math.random() - 0.5) * 50;
            const size = Math.random() * 20 + 12;

            let style: React.CSSProperties = {
                position: 'absolute',
                zIndex: 5,
                pointerEvents: 'none',
                width: `${size}px`,
                height: `${size}px`,
            };

            switch(side) {
                case 0: style.top = '-25%'; style.left = `${50 + offset}%`; style.transform = 'translateX(-50%)'; break;
                case 1: style.top = `${50 + offset}%`; style.right = '-25%'; style.transform = 'translateY(-50%)'; break;
                case 2: style.bottom = '-25%'; style.left = `${50 + offset}%`; style.transform = 'translateX(-50%)'; break;
                case 3: style.top = `${50 + offset}%`; style.left = '-25%'; style.transform = 'translateY(-50%)'; break;
            }

            decorations.push({ src: rockSrc, x: island.x, y: island.y, size, style });
        }
    });

    // Generate rocks in the outer padding
    const PADDING_ROCKS_DENSITY = 0.5; // Rocks per tile-worth of space
    const totalSize = TILE_SIZE + TILE_GAP;
    const numRocksVertical = Math.floor(mapSize * PADDING_ROCKS_DENSITY);
    const numRocksHorizontal = Math.floor(mapSize * PADDING_ROCKS_DENSITY);

    for(let i = 0; i < numRocksVertical; i++) {
        const yPos = Math.random() * (mapSize * totalSize);
        // Left padding
        decorations.push(createPaddingRock(yPos, -50, totalSize));
        // Right padding
        decorations.push(createPaddingRock(yPos, (mapSize * totalSize) + 50, totalSize));
    }
     for(let i = 0; i < numRocksHorizontal; i++) {
        const xPos = Math.random() * (mapSize * totalSize);
        // Top padding
        decorations.push(createPaddingRock(-50, xPos, totalSize));
        // Bottom padding
        decorations.push(createPaddingRock((mapSize * totalSize) + 50, xPos, totalSize));
    }


    return decorations;
};

function createPaddingRock(top: number, left: number, totalTileSize: number) {
    const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
    const size = Math.random() * 30 + 15;
    const randomOffsetX = (Math.random() - 0.5) * totalTileSize * 0.5;
    const randomOffsetY = (Math.random() - 0.5) * totalTileSize * 0.5;

    return {
        src: rockSrc,
        x: -1, // Special value to indicate padding rock
        y: -1,
        size,
        style: {
            position: 'absolute',
            top: `${top + randomOffsetY}px`,
            left: `${left + randomOffsetX}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            pointerEvents: 'none',
            width: `${size}px`,
            height: `${size}px`,
        } as React.CSSProperties
    };
}


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
    if (!map) return [];
    return generateDecorations(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const totalSize = TILE_SIZE + TILE_GAP;
  const mapSize = map.length;
  const PADDING = 100;

  const totalMapWidth = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP);
  const totalMapHeight = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP);

  return (
    <div
      className="absolute"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <div
        className="absolute bg-water-pattern bg-repeat"
        style={{
          width: `${totalMapWidth + PADDING * 2}px`,
          height: `${totalMapHeight + PADDING * 2}px`,
          top: `-${PADDING}px`,
          left: `-${PADDING}px`,
        }}
      />
      {decorations.filter(d => d.x === -1).map((deco, index) => (
          <Image
            key={`padding-deco-${index}`}
            src={deco.src}
            alt="decorative rock"
            width={deco.size}
            height={deco.size}
            style={deco.style}
            unoptimized
          />
      ))}
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

    

    