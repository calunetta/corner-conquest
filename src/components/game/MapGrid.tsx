

import type { Island, Player, GameAction } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { useMemo } from 'react';
import Image from 'next/image';
import { TILE_GAP, TILE_SIZE, BASE_TILE_SIZE } from '@/lib/game-logic';
import { PADDING } from './GameBoard';

const ROCK_SPRITES = [
    '/sprites/small_rock.gif',
    '/sprites/mini_rock.gif',
    '/sprites/medium_rock.gif',
    '/sprites/big_rock.gif',
];

const generateDecorations = (map: Island[][]) => {
    if (!map || map.length === 0) return [];
    const decorations: { src: string; x: number; y: number; size: number, style: React.CSSProperties }[] = [];
    
    const mapSize = map.length;
    const totalSize = TILE_SIZE + TILE_GAP;

    // Generate rocks around islands
    map.flat().forEach(island => {
        const rockCount = 1 + Math.floor(Math.random() * 2); 
        let possibleSides = [0, 1, 2, 3]; // 0: top, 1: right, 2: bottom, 3: left

        for (let i = 0; i < rockCount; i++) {
            const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
            const sideIndex = Math.floor(Math.random() * possibleSides.length);
            const side = possibleSides.splice(sideIndex, 1)[0];

            const offset = (Math.random() - 0.5) * TILE_SIZE * 0.7;
            const size = Math.random() * 20 + 12;

            let style: React.CSSProperties = {
                position: 'absolute',
                zIndex: 5,
                pointerEvents: 'none',
                width: `${size}px`,
                height: `${size}px`,
            };
            
            const islandLeft = island.x * totalSize + PADDING;
            const islandTop = island.y * totalSize + PADDING;

            switch(side) {
                case 0: style.top = `${islandTop - size * 0.7}px`; style.left = `${islandLeft + TILE_SIZE/2 + offset}px`; break; // Top
                case 1: style.top = `${islandTop + TILE_SIZE/2 + offset}px`; style.left = `${islandLeft + TILE_SIZE + size * 0.3}px`; break; // Right
                case 2: style.top = `${islandTop + TILE_SIZE + size * 0.3}px`; style.left = `${islandLeft + TILE_SIZE/2 + offset}px`; break; // Bottom
                case 3: style.top = `${islandTop + TILE_SIZE/2 + offset}px`; style.left = `${islandLeft - size * 0.7}px`; break; // Left
            }

            decorations.push({ src: rockSrc, x: island.x, y: island.y, size, style });
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
  
  const decorations = useMemo(() => generateDecorations(map), [map]);

  const totalSize = TILE_SIZE + TILE_GAP;
  const mapSize = map.length;

  const totalMapWidth = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP) + PADDING * 2;
  const totalMapHeight = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP) + PADDING * 2;

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
                width: `${totalMapWidth}px`,
                height: `${totalMapHeight}px`,
            }}
        />
        {decorations.map((deco, index) => (
            <Image
                key={`deco-${index}`}
                src={deco.src}
                alt="decorative rock"
                width={deco.size}
                height={deco.size}
                style={deco.style}
                unoptimized
            />
        ))}
        <div 
          className="absolute"
          style={{
            width: `${totalMapWidth}px`,
            height: `${totalMapHeight}px`,
          }}
        >
      {map.flat().map((island) => {
        const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
        const isSelected = selectedTile?.x === island.x && selectedTile?.y === island.y;
        const isCurrentPlayerTile = island.occupants.some(o => o.playerId === currentPlayerId);
        
        const armyOnTile = island.occupants.find(o => o.playerId === currentPlayerId);
        const isArmySelectedOnTile = (isTeleporting && armyOnTile?.armyId === teleportingArmyId) || (!isTeleporting && selectedArmy?.position.x === island.x && selectedArmy?.position.y === island.y);
        
        const isScoutTarget = isScouting && island.isHidden;
        
        const isBase = island.type === 'base';
        const currentTileSize = isBase ? BASE_TILE_SIZE : TILE_SIZE;
        const offset = (currentTileSize - TILE_SIZE) / 2;

        return (
          <div 
            key={island.id} 
            className="absolute z-10"
            style={{
              width: `${currentTileSize}px`,
              height: `${currentTileSize}px`,
              left: `${PADDING + island.x * totalSize - (isBase ? offset : 0)}px`,
              top: `${PADDING + island.y * totalSize - (isBase ? offset : 0)}px`,
            }}
          >
            <IslandTile
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
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
