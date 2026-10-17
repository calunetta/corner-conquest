import tileVariantsConfig from './tile-variants.config.json';
import type { TileVariant, TileVariantsConfig } from './TileVariants.config';
import { assignTileVariants, mixSeed, REPEAT_RADIUS, type VariantTile } from './TileVariants.assign.map';

function variant(id: string, type: TileVariant['type'], color: TileVariant['color'] = null): TileVariant {
  return { id, type, name: id, image: null, transform: { x: 50, y: 50, size: 100 }, color };
}

function board(size: number, type: VariantTile['type'], color?: VariantTile['color']): VariantTile[] {
  const tiles: VariantTile[] = [];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) tiles.push({ id: `${x}-${y}`, x, y, type, color });
  return tiles;
}

const config = (variants: TileVariant[]): TileVariantsConfig => ({ images: [], variants });
const poolOf = (count: number) => Array.from({ length: count }, (_, i) => variant(`special-${i}`, 'special'));

describe('assignTileVariants', () => {
  it('never gives two tiles within the repeat radius the same variant when the pool allows it', () => {
    const tiles = board(12, 'special');
    const result = assignTileVariants(tiles, config(poolOf(10)));

    for (const a of tiles) {
      for (const b of tiles) {
        if (a.id === b.id) continue;
        const distance = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
        if (distance <= REPEAT_RADIUS) expect(result.get(a.id)).not.toBe(result.get(b.id));
      }
    }
  });

  it('is deterministic for the same board', () => {
    const tiles = board(6, 'special');
    const first = assignTileVariants(tiles, config(poolOf(8)));
    const second = assignTileVariants([...tiles].reverse(), config(poolOf(8)));

    expect([...second.entries()].sort()).toEqual([...first.entries()].sort());
  });

  it('uses a base tile only from its own colour pool and leaves tiles without a pool out', () => {
    const variants = [variant('base-blue-a', 'base', 'blue'), variant('base-red-a', 'base', 'red')];
    const tiles: VariantTile[] = [
      { id: 'b', x: 0, y: 0, type: 'base', color: 'blue' },
      { id: 'r', x: 1, y: 0, type: 'base', color: 'red' },
      { id: 'n', x: 2, y: 0, type: 'base', color: 'purple' },
    ];

    const result = assignTileVariants(tiles, config(variants));

    expect(result.get('b')).toBe('base-blue-a');
    expect(result.get('r')).toBe('base-red-a');
    expect(result.has('n')).toBe(false);
  });

  it('spreads the picks across the pool instead of favouring one entry', () => {
    const counts = new Map<number, number>();
    for (let seed = 0; seed < 1000; seed += 1) counts.set(mixSeed(seed) % 10, (counts.get(mixSeed(seed) % 10) ?? 0) + 1);
    expect(Math.min(...counts.values())).toBeGreaterThan(60);
  });

  it('keeps touching tiles apart on a real 12x12 blue base board', () => {
    const tiles = board(12, 'base', 'blue');
    const result = assignTileVariants(tiles, tileVariantsConfig as TileVariantsConfig);

    for (const tile of tiles) {
      const right = tiles.find((other) => other.x === tile.x + 1 && other.y === tile.y);
      const below = tiles.find((other) => other.x === tile.x && other.y === tile.y + 1);
      for (const neighbour of [right, below]) {
        if (neighbour) expect(result.get(neighbour.id)).not.toBe(result.get(tile.id));
      }
    }
  });
});
