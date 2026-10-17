import type { TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import type { DecorationLayoutsConfig } from './decoration-layouts.types';
import {
  isDecorationImagePath,
  removeImageFromLayouts,
  removeImageFromVariants,
} from './decoration-image-cleanup.map';

const BROKEN = '/sprites/decorations/broken.png';
const KEEP = '/sprites/decorations/tree-1.gif';

function instance(id: string, image: string) {
  return { id, image, top: 50, left: 50, size: 10, z: 10 };
}

function layoutsConfig(): DecorationLayoutsConfig {
  const layout = { id: 'l1', name: 'L1', instances: [instance('a', BROKEN), instance('b', KEEP), instance('c', BROKEN)] };
  const empty = { id: 'e', name: 'E', instances: [] };
  return {
    base: [layout],
    special: [layout],
    'empty-2': [empty],
    'empty-3': [empty],
    'resource-1': [empty],
    'resource-2': [empty],
    'resource-3': [empty],
    'resource-4': [empty],
    'monster-alive': [empty],
    'monster-cleared': [empty],
  };
}

describe('isDecorationImagePath', () => {
  it('accepts a decoration file directly in the folder', () => {
    expect(isDecorationImagePath(BROKEN)).toBe(true);
  });

  it('rejects paths outside the folder, nested paths and other extensions', () => {
    expect(isDecorationImagePath('/sprites/tile-variants/base/a.png')).toBe(false);
    expect(isDecorationImagePath('/sprites/decorations/../secret.png')).toBe(false);
    expect(isDecorationImagePath('/sprites/decorations/generated/a.png')).toBe(false);
    expect(isDecorationImagePath('/sprites/decorations/notes.txt')).toBe(false);
    expect(isDecorationImagePath(null)).toBe(false);
  });
});

describe('removeImageFromLayouts', () => {
  it('drops every instance of the image in every scenario and counts them', () => {
    const { config, removed } = removeImageFromLayouts(layoutsConfig(), BROKEN);

    expect(removed).toBe(4);
    expect(config.base[0].instances.map((i) => i.id)).toEqual(['b']);
    expect(config.special[0].instances.map((i) => i.id)).toEqual(['b']);
  });

  it('leaves the input untouched', () => {
    const input = layoutsConfig();
    removeImageFromLayouts(input, BROKEN);

    expect(input.base[0].instances).toHaveLength(3);
  });
});

describe('removeImageFromVariants', () => {
  it('drops the image from variant decorations only and keeps variant pictures', () => {
    const config: TileVariantsConfig = {
      images: [],
      variants: [
        {
          id: 'v1',
          type: 'base',
          name: 'V1',
          image: BROKEN,
          transform: { x: 50, y: 50, size: 100 },
          color: 'blue',
          decorations: { base: [{ id: 'd', name: 'D', instances: [instance('x', BROKEN), instance('y', KEEP)] }] },
        },
      ],
    };

    const result = removeImageFromVariants(config, BROKEN);

    expect(result.removed).toBe(1);
    expect(result.config.variants[0].image).toBe(BROKEN);
    expect(result.config.variants[0].decorations?.base?.[0].instances.map((i) => i.id)).toEqual(['y']);
  });
});
