import { applyColors, isTileVariantsEdit, validateTileVariantsEdit } from './TileVariants.validate';
import type { TileVariantsConfig } from './TileVariants.config';

const config: TileVariantsConfig = {
  variants: [
    { id: 'special-a', type: 'special', name: 'a', image: '/a.png', color: null },
    { id: 'base-red-1', type: 'base', name: 'castle', image: '/c.png', color: 'red' },
    { id: 'base-plain', type: 'base', name: 'plain', image: '/p.png', color: null },
  ],
  selected: {},
};

describe('isTileVariantsEdit', () => {
  it('accepts known slots and colours', () => {
    expect(isTileVariantsEdit({ selected: { special: 'special-a' }, colors: { 'base-plain': 'blue' } })).toBe(true);
  });

  it('rejects an unknown slot or colour', () => {
    expect(isTileVariantsEdit({ selected: { castle: 'x' }, colors: {} })).toBe(false);
    expect(isTileVariantsEdit({ selected: {}, colors: { 'base-plain': 'green' } })).toBe(false);
  });
});

describe('validateTileVariantsEdit', () => {
  it('allows a special variant in the special slot', () => {
    expect(validateTileVariantsEdit(config, { selected: { special: 'special-a' }, colors: {} })).toBeNull();
  });

  it('rejects a variant of the wrong type for the slot', () => {
    expect(validateTileVariantsEdit(config, { selected: { monster: 'special-a' }, colors: {} })).toMatch(/cannot fill/);
  });

  it('only accepts a base variant for the castle colour it is set to', () => {
    expect(validateTileVariantsEdit(config, { selected: { 'base-red': 'base-red-1' }, colors: {} })).toBeNull();
    expect(validateTileVariantsEdit(config, { selected: { 'base-blue': 'base-red-1' }, colors: {} })).toMatch(/cannot fill/);
  });

  it('checks the colour edit before the selection, so a new colour can enable a slot', () => {
    expect(validateTileVariantsEdit(config, { selected: { 'base-blue': 'base-plain' }, colors: { 'base-plain': 'blue' } })).toBeNull();
  });

  it('rejects an unknown variant id', () => {
    expect(validateTileVariantsEdit(config, { selected: { special: 'missing' }, colors: {} })).toMatch(/No variant/);
  });
});

describe('applyColors', () => {
  it('sets and clears colours by variant id', () => {
    const [special, castle] = applyColors(config.variants, { 'special-a': null, 'base-red-1': 'purple' });
    expect(special.color).toBeNull();
    expect(castle.color).toBe('purple');
  });
});
