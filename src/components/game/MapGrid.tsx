
import type { Island, Player, GameAction } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { useMemo } from 'react';
import Image from 'next/image';

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

const ROCK_SPRITES = [
    '/sprites/small_rock.gif',
    '/sprites/mini_rock.gif',
    '/sprites/medium_rock.gif',
    '/sprites/big_rock.gif',
];

// We'll memoize this so the rocks don't change on every re-render
const generateDecorations = (map: Island[][]) => {
    const decorations: { src: string; x: number; y: number; size: number, style: React.CSSProperties }[] = [];
    const mapSize = map.length;

    map.flat().forEach(island => {
        // Give a 30% chance for an island to have rocks
        if (Math.random() < 0.3) {
            const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
            
            // Randomize position around the island edge
            const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            const offset = (Math.random() - 0.5) * 40; // -20% to +20% offset
            const size = Math.random() * 24 + 16; // Random size between 16px and 40px

            let style: React.CSSProperties = {
                position: 'absolute',
                zIndex: 5, // Below islands (z-10) but above water (z-0)
                pointerEvents: 'none',
                width: `${size}px`,
                height: `${size}px`,
            };

            switch(side) {
                case 0: // Top
                    style.top = '-15%';
                    style.left = `${50 + offset}%`;
                    style.transform = 'translateX(-50%)';
                    break;
                case 1: // Right
                    style.top = `${50 + offset}%`;
                    style.right = '-15%';
                    style.transform = 'translateY(-50%)';
                    break;
                case 2: // Bottom
                    style.bottom = '-15%';
                    style.left = `${50 + offset}%`;
                    style.transform = 'translateX(-50%)';
                    break;
                case 3: // Left
                    style.top = `${50 + offset}%`;
                    style.left = '-15%';
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


export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, currentPlayerId, selectedArmyId, isTeleporting, isScouting }: MapGridProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const selectedArmy = selectedArmyId !== null && currentPlayer ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const teleportingArmyId = isTeleporting && players[currentPlayerId]?.teleportState?.armyId !== null ? players[currentPlayerId]?.teleportState?.armyId : null;

  const mapSize = map.length;
  
  const decorations = useMemo(() => generateDecorations(map), [map]);

  return (
    <div
      className="relative grid rounded-xl border-2 border-muted bg-water-pattern bg-repeat p-2 w-full h-full"
      style={{
        gridTemplateColumns: `repeat(${mapSize}, 1fr)`,
        gridTemplateRows: `repeat(${mapSize}, 1fr)`,
        gap: '0.5rem',
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
            className="relative z-10"
            style={{ gridColumn: island.x + 1, gridRow: island.y + 1 }}
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
