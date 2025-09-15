import type { Island, Player, GameAction } from '@/lib/types';
import { IslandTile } from './IslandTile';

type MapGridProps = {
  map: Island[][];
  players: Player[];
  onTileClick: (x: number, y: number) => void;
  possibleMoves: { x: number, y: number }[];
  selectedTile: { x: number, y: number } | null;
  currentPlayerId: number;
  selectedArmyId: number | null;
};

export function MapGrid({ map, players, onTileClick, possibleMoves, selectedTile, currentPlayerId, selectedArmyId }: MapGridProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const selectedArmy = selectedArmyId !== null && currentPlayer ? currentPlayer.armies.find(a => a.id === selectedArmyId) : null;

  return (
    <div
      className="grid gap-2 p-4 bg-muted/20 rounded-xl border-2 border-muted w-full h-full"
      style={{
        gridTemplateColumns: `repeat(${map.length}, minmax(0, 1fr))`,
      }}
    >
      {map.flat().map((island) => {
        const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
        const isSelected = selectedTile?.x === island.x && selectedTile?.y === island.y;
        const isCurrentPlayerTile = island.occupants.some(o => o.playerId === currentPlayerId);
        const isArmySelectedOnTile = selectedArmy?.position.x === island.x && selectedArmy?.position.y === island.y;
        
        return (
          <IslandTile
            key={island.id}
            island={island}
            players={players}
            onClick={onTileClick}
            isPossibleMove={isPossible}
            isSelected={isSelected}
            isCurrentPlayerTile={isCurrentPlayerTile}
            isArmySelectedOnTile={isArmySelectedOnTile}
          />
        );
      })}
    </div>
  );
}
