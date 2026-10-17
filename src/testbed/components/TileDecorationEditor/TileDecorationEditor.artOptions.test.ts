import type { TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toArtOptions } from './TileDecorationEditor.map';

const config: TileVariantsConfig = {
  images: [],
  variants: [
    { id: 'default-special', type: 'special', name: 'Default', image: null, transform: { x: 50, y: 50, size: 100 }, color: null },
    { id: 'special-fire', type: 'special', name: 'fire', image: null, transform: { x: 50, y: 50, size: 100 }, color: null },
  ],
};

describe('toArtOptions', () => {
  it('lists only one Default entry, then the non-default variants of the scenario', () => {
    expect(toArtOptions('special', config)).toEqual([
      { id: 'default', label: 'Default' },
      { id: 'special-fire', label: 'fire' },
    ]);
  });

  it('offers just the Default entry when the scenario has no variants', () => {
    expect(toArtOptions('monster', config)).toEqual([{ id: 'default', label: 'Default' }]);
  });
});
