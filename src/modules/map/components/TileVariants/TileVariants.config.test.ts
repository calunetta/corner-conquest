import { isTileVariantsConfig, pickVariant, poolFor, type TileVariant, type TileVariantsConfig } from './TileVariants.config';
import tileVariantsConfig from './tile-variants.config.json';

const centred = { x: 50, y: 50, size: 100 };
const variant = (id: string, type: TileVariant['type'], color: TileVariant['color'] = null): TileVariant => ({
  id,
  type,
  name: id,
  image: null,
  transform: centred,
  color,
});

const sample: TileVariantsConfig = {
  images: [],
  variants: [
    variant('special-default', 'special'),
    variant('special-a', 'special'),
    variant('base-red-default', 'base', 'red'),
    variant('base-blue-default', 'base', 'blue'),
    variant('base-red-castle', 'base', 'red'),
  ],
};

describe('isTileVariantsConfig', () => {
  it('accepts a well-formed config', () => {
    expect(isTileVariantsConfig(sample)).toBe(true);
  });

  it('rejects a variant with an unknown type or a missing transform', () => {
    expect(isTileVariantsConfig({ images: [], variants: [{ ...sample.variants[0], type: 'castle' }] })).toBe(false);
    expect(isTileVariantsConfig({ images: [], variants: [{ ...sample.variants[0], transform: undefined }] })).toBe(false);
  });

  it('accepts the checked-in config file', () => {
    expect(isTileVariantsConfig(tileVariantsConfig)).toBe(true);
  });
});

describe('poolFor', () => {
  it('returns every variant of a non-base type', () => {
    expect(poolFor(sample, 'special').map((entry) => entry.id)).toEqual(['special-default', 'special-a']);
  });

  it('returns base variants only for the requested castle colour', () => {
    expect(poolFor(sample, 'base', 'red').map((entry) => entry.id)).toEqual(['base-red-default', 'base-red-castle']);
  });
});

describe('pickVariant', () => {
  it('returns the same variant for the same seed', () => {
    const pool = poolFor(sample, 'special');
    expect(pickVariant(pool, 42)).toBe(pickVariant(pool, 42));
  });

  it('uses every variant of the pool across a board of seeds', () => {
    const pool = poolFor(sample, 'special');
    const used = new Set<string>();
    for (let seed = 0; seed < 200; seed++) used.add(pickVariant(pool, seed)!.id);
    expect([...used].sort()).toEqual(['special-a', 'special-default']);
  });

  it('returns null for an empty pool', () => {
    expect(pickVariant([], 1)).toBeNull();
  });
});
