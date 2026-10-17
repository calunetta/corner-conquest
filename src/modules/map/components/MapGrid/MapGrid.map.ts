import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import type { Island, Player } from '@/lib/types';
import { decorationVariantType, type VariantTile } from '../TileVariants';

export function toGridDimensions(map: Island[]): { cols: number; rows: number } {
  if (!map || map.length === 0) {
    return { cols: MAP_COLS, rows: MAP_ROWS };
  }
  const cols = Math.max(...map.map((i) => i.x), 0) + 1;
  const rows = Math.max(...map.map((i) => i.y), 0) + 1;
  return { cols, rows };
}

/** The board's tiles as the variant assignment sees them: the variant type each tile draws, and a base's owner colour. */
export function toVariantTiles(islands: Island[], players: Player[]): VariantTile[] {
  return islands.flatMap((island) => {
    const type = decorationVariantType(island);
    if (!type) return [];
    const owner = island.owner === undefined ? undefined : players.find((player) => player.id === island.owner);
    return [{ id: island.id, x: island.x, y: island.y, type, color: owner?.color }];
  });
}
