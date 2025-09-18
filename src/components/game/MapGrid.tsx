

import type { Island, Player } from '@/lib/types';
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

const generateDecorations = () => {
    const decorations: { src: string; style: React.CSSProperties }[] = [];
    const totalGridWidth = (MAP_COLS * TILE_SIZE) + ((MAP_COLS - 1) * TILE_GAP);
    const totalGridHeight = (MAP_ROWS * TILE_SIZE) + ((MAP_ROWS - 1) * TILE_GAP);

    const rockCount = 30;

    for (let i = 0; i < rockCount; i++) {
        const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
        const size = Math.random() * 20 + 12;
        
        const style: React.CSSProperties = {
            position: 'absolute',
            zIndex: 5,
            pointerEvents: 'none',
            width: `${size}px`,
            height: `${size}px`,
            left: `${Math.random() * totalGridWidth}px`,
            top: `${Math.random() * totalGridHeight}px`,
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
};

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, currentPlayerId, selectedArmyId, isTeleporting, isScouting }: MapGridProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const selectedArmy = selectedArmyId !== null && currentPlayer ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const teleportingArmyId = isTeleporting && players[currentPlayerId]?.teleportState?.armyId !== null ? players[currentPlayerId]?.teleportState?.armyId : null;
  
  const isMobile = useIsMobile();
  const decorations = useMemo(() => generateDecorations(), []);

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
        }}
      >
        {map.flat().map((island) => {
          const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
          const isSelected = selectedTile?.x === island.x && selectedTile?.y === island.y;
          const isCurrentPlayerTile = island.occupants.some(o => o.playerId === currentPlayerId);
          
          const armyOnTile = island.occupants.find(o => o.playerId === currentPlayerId);
          const isArmySelectedOnTile = (isTeleporting && armyOnTile?.armyId === teleportingArmyId) || (!isTeleporting && selectedArmy?.position.x === island.x && selectedArmy?.position.y === island.y);
          
          const isScoutTarget = isScouting && island.isHidden;
          
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
            />
          );
        })}
      </div>
    </div>
  );
}

    