import { toSlug, toVariantId, validateVariant, variantsUsingImage } from './TileVariants.validate';
import type { TileVariant, TileVariantsConfig } from './TileVariants.config';

const centred = { x: 50, y: 50, size: 100 };
const config: TileVariantsConfig = {
  images: [
    { id: 'empty-a', type: 'empty', name: 'a', image: '/sprites/tile-variants/generated/empty/a.png' },
    { id: 'base-b', type: 'base', name: 'b', image: '/sprites/tile-variants/generated/base/b.png' },
  ],
  variants: [{ id: 'empty-taken', type: 'empty', name: 'taken', image: null, transform: centred, color: null }],
};
const draft = (overrides: Partial<TileVariant> = {}): TileVariant => ({
  id: 'empty-new',
  type: 'empty',
  name: 'New look',
  image: '/sprites/tile-variants/generated/empty/a.png',
  transform: { x: 30, y: 40, size: 50 },
  color: null,
  ...overrides,
});

describe('toSlug and toVariantId', () => {
  it('makes a safe slug from a name', () => {
    expect(toSlug('  Ember Haze! ')).toBe('ember-haze');
    expect(toSlug('../../etc')).toBe('etc');
  });

  it('includes the colour in base ids', () => {
    expect(toVariantId('base', 'red', 'Castle A')).toBe('base-red-castle-a');
    expect(toVariantId('special', null, 'Castle A')).toBe('special-castle-a');
  });
});

describe('validateVariant', () => {
  it('accepts a valid variant on an image of its type', () => {
    expect(validateVariant(config, draft(), true)).toBeNull();
  });

  it('rejects an empty name and an out-of-range size', () => {
    expect(validateVariant(config, draft({ name: '  ' }), true)).toMatch(/name/);
    expect(validateVariant(config, draft({ transform: { x: 10, y: 10, size: 500 } }), true)).toMatch(/out of range/);
  });

  it('rejects a name that already exists for the type', () => {
    expect(validateVariant(config, draft({ id: 'empty-taken', name: 'taken' }), true)).toMatch(/already exists/);
    expect(validateVariant(config, draft({ id: 'empty-taken', name: 'taken' }), false)).toBeNull();
  });

  it('requires a colour on base castles and only base castles may have one', () => {
    expect(validateVariant(config, draft({ type: 'base', color: null, image: null }), true)).toMatch(/needs a colour/);
    expect(validateVariant(config, draft({ color: 'red' }), true)).toMatch(/Only base castles/);
  });

  it('refuses a picture on the special and resource islands, which always use the built-in art', () => {
    expect(validateVariant(config, draft({ type: 'resource-gold', color: null }), true)).toMatch(/built-in art/);
    expect(validateVariant(config, draft({ image: null }), true)).toBeNull();
    expect(validateVariant(config, draft({ type: 'resource-wood', image: null }), true)).toBeNull();
  });

  it('rejects an image that is not in the folders or belongs to another type', () => {
    expect(validateVariant(config, draft({ image: '/sprites/other.png' }), true)).toMatch(/not in the tile-variant/);
    expect(validateVariant(config, draft({ image: config.images[1].image }), true)).toMatch(/another type/);
  });
});

describe('variantsUsingImage', () => {
  it('lists the variants that draw the picture', () => {
    const picture = '/sprites/tile-variants/generated/special/a.png';
    const withPicture = { ...draft(), id: 'special-uses-a', image: picture };
    const using = variantsUsingImage({ ...config, variants: [...config.variants, withPicture] }, picture);
    expect(using.map((variant) => variant.id)).toEqual(['special-uses-a']);
  });

  it('is empty when no variant draws the picture', () => {
    expect(variantsUsingImage(config, '/sprites/tile-variants/generated/special/a.png')).toEqual([]);
  });
});
