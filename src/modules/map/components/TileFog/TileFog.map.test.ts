import { toFogVariant, type FogVariant } from './TileFog.config';
import { NEUTRAL_FOG_COLOUR, toNeutralFogStyle } from './TileFog.map';

const variants: FogVariant[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
  id,
  name: id,
  still: `/${id}.png`,
  animation: '/a.gif',
  frameDelayMs: 150,
  passMs: 1200,
}));

describe('toFogVariant', () => {
  it('returns the same variant for the same seed', () => {
    expect(toFogVariant(variants, 42)).toBe(toFogVariant(variants, 42));
  });

  it('uses every variant across a board of tiles', () => {
    const used = new Set<string>();
    for (let x = 0; x < 9; x++) {
      for (let y = 0; y < 9; y++) used.add(toFogVariant(variants, x * 31 + y).id);
    }
    expect([...used].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('toNeutralFogStyle', () => {
  it('returns no style when the setting is off, so the fog keeps its terrain colour', () => {
    expect(toNeutralFogStyle(false)).toBeUndefined();
  });

  it('returns the neutral grey backing when the setting is on', () => {
    expect(toNeutralFogStyle(true)).toEqual({ backgroundColor: NEUTRAL_FOG_COLOUR });
  });
});
