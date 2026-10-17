// Gives each tile of the board a variant so that look-alike tiles are not close together. Pure: no React.
import type { PlayerColor } from '@/lib/types';
import { poolFor, type TileVariant, type TileVariantType, type TileVariantsConfig } from './TileVariants.config';

export interface VariantTile {
  id: string;
  x: number;
  y: number;
  type: TileVariantType;
  /** Base tiles only: the owner's colour, which picks the pool. */
  color?: PlayerColor;
}

/** Touching tiles (Chebyshev distance 1) never share a variant. Pools of 9+ variants always leave a free choice; smaller pools fall back. */
export const REPEAT_RADIUS = 1;

/** A murmur-style finaliser: neighbouring seeds land on unrelated pool entries, unlike a plain multiplier. */
export function mixSeed(seed: number): number {
  let x = Math.trunc(seed) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Returns the variant id for every tile that has a pool. Tiles are visited in board order, so the result is stable. */
export function assignTileVariants(tiles: VariantTile[], config: TileVariantsConfig): Map<string, string> {
  const ordered = [...tiles].sort((a, b) => a.y - b.y || a.x - b.x);
  const chosenAt = new Map<string, string>();
  const assigned = new Map<string, string>();

  for (const tile of ordered) {
    const pool = poolFor(config, tile.type, tile.color);
    if (pool.length === 0) continue;
    const start = mixSeed(tile.x * 31 + tile.y) % pool.length;
    const choice = pickAvoidingNeighbours(pool, start, tile, chosenAt);
    assigned.set(tile.id, choice.id);
    chosenAt.set(tileKey(tile.x, tile.y), choice.id);
  }
  return assigned;
}

function pickAvoidingNeighbours(
  pool: TileVariant[],
  start: number,
  tile: VariantTile,
  chosenAt: Map<string, string>,
): TileVariant {
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    if (!hasRepeatNearby(candidate.id, tile, chosenAt)) return candidate;
  }
  return pool[start];
}

function hasRepeatNearby(variantId: string, tile: VariantTile, chosenAt: Map<string, string>): boolean {
  for (let dy = -REPEAT_RADIUS; dy <= REPEAT_RADIUS; dy += 1) {
    for (let dx = -REPEAT_RADIUS; dx <= REPEAT_RADIUS; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (chosenAt.get(tileKey(tile.x + dx, tile.y + dy)) === variantId) return true;
    }
  }
  return false;
}
