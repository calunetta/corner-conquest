import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import type { Island } from '@/lib/types';

export function toGridDimensions(map: Island[]): { cols: number; rows: number } {
  if (!map || map.length === 0) {
    return { cols: MAP_COLS, rows: MAP_ROWS };
  }
  const cols = Math.max(...map.map((i) => i.x), 0) + 1;
  const rows = Math.max(...map.map((i) => i.y), 0) + 1;
  return { cols, rows };
}
