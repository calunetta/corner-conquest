
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

const DECORATIVE_ROCK_COUNT = 10;
const ROCK_SPRITES = ['/sprites/rock_1.gif', '/sprites/rock_2.gif'];

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, currentPlayerId, selectedArmyId, isTeleporting, isScouting }: MapGridProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const selectedArmy = selectedArmyId !== null && currentPlayer ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;
  const teleportingArmyId = isTeleporting && players[currentPlayerId]?.teleportState?.armyId !== null ? players[currentPlayerId]?.teleportState?.armyId : null;

  const decorativeRocks = useMemo(() => {
    const rocks = [];
    const mapSize = map.length;
    for (let i = 0; i < DECORATIVE_ROCK_COUNT; i++) {
        const top = `${Math.random() * 100}%`;
        const left = `${Math.random() * 100}%`;
        const sprite = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
        const size = `${Math.random() * (48 - 24) + 24}px`; // Random size between 24px and 48px
        const opacity = Math.random() * (0.7 - 0.4) + 0.4; // Random opacity

        rocks.push({ id: i, style: { top, left, width: size, height: size, opacity }, sprite });
    }
    return rocks;
  }, [map.length]);

  return (
    <div
      className="relative grid gap-2 p-4 bg-water-pattern bg-repeat rounded-xl border-2 border-muted w-full h-full"
      style={{
        gridTemplateColumns: `repeat(${map.length}, minmax(0, 1fr))`,
      }}
    >
       {/* Decorative Rocks Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            {decorativeRocks.map(rock => (
                <Image
                    key={rock.id}
                    src={rock.sprite}
                    alt="Decorative Rock"
                    width={64}
                    height={64}
                    unoptimized
                    className="absolute"
                    style={{ ...rock.style, transform: 'translate(-50%, -50%)' }}
                />
            ))}
        </div>

      {map.flat().map((island) => {
        const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
        const isSelected = selectedTile?.x === island.x && selectedTile?.y === island.y;
        const isCurrentPlayerTile = island.occupants.some(o => o.playerId === currentPlayerId);
        
        const armyOnTile = island.occupants.find(o => o.playerId === currentPlayerId);
        const isArmySelectedOnTile = (isTeleporting && armyOnTile?.armyId === teleportingArmyId) || (!isTeleporting && selectedArmy?.position.x === island.x && selectedArmy?.position.y === island.y);
        
        const isScoutTarget = isScouting && island.isHidden;

        return (
          <div key={island.id} className="relative z-10">
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
