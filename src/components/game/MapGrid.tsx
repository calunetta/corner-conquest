import type { Island, Player, GameAction } from '@/lib/types';
import { IslandTile } from './IslandTile';

type MapGridProps = {
  map: Island[][];
  players: Player[];
  onTileClick: (x: number, y: number) => void;
  possibleMoves: { x: number, y: number }[];
  selectedTile: { x: number, y: number } | null;
};

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile }: MapGridProps) {
  return (
    <div
      className="grid gap-1.5 p-4 bg-muted/20 rounded-xl border-2 border-muted"
      style={{
        gridTemplateColumns: `repeat(${map.length}, minmax(0, 1fr))`,
      }}
    >
      {map.flat().map((island) => {
        const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
        const isSelected = selectedTile?.x === island.x && selectedTile?.y === island.y;
        return (
          <IslandTile
            key={island.id}
            island={island}
            players={players}
            onClick={onTileClick}
            isPossibleMove={isPossible}
            isSelected={isSelected}
          />
        );
      })}
    </div>
  );
}
