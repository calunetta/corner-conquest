import { isTileVariantsConfig, variantsOfType, type TileVariantsConfig } from './TileVariants.config';
import tileVariantsConfig from './tile-variants.config.json';

const sample: TileVariantsConfig = {
  variants: [
    { id: 'special-a', type: 'special', name: 'a', image: '/a.png', color: null },
    { id: 'base-red', type: 'base', name: 'red', image: '/red.png', color: 'red' },
    { id: 'special-b', type: 'special', name: 'b', image: '/b.png', color: null },
  ],
  selected: {},
};

describe('isTileVariantsConfig', () => {
  it('accepts a well-formed config', () => {
    expect(isTileVariantsConfig(sample)).toBe(true);
  });

  it('rejects an unknown variant type', () => {
    const broken = { variants: [{ ...sample.variants[0], type: 'castle' }], selected: {} };
    expect(isTileVariantsConfig(broken)).toBe(false);
  });

  it('rejects a missing variants list', () => {
    expect(isTileVariantsConfig({ selected: {} })).toBe(false);
  });

  it('accepts the checked-in config file', () => {
    expect(isTileVariantsConfig(tileVariantsConfig)).toBe(true);
  });
});

describe('variantsOfType', () => {
  it('returns only the variants of that type, in order', () => {
    expect(variantsOfType(sample, 'special').map((variant) => variant.id)).toEqual(['special-a', 'special-b']);
  });

  it('returns an empty list when a type has no folder entries yet', () => {
    expect(variantsOfType(sample, 'monster')).toEqual([]);
  });
});
