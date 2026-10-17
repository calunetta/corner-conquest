import { CENTRED_TRANSFORM, type TileVariant } from '@/modules/map/components/TileVariants/TileVariants.config';
import { hasUnsavedChanges, toDecorationEditorHref, toRevertedDefault } from './TileVariantEditor.draft';

describe('toRevertedDefault', () => {
  it('puts a default variant back to the built-in look and drops its decorations', () => {
    const customised: TileVariant = {
      id: 'default-base-red',
      type: 'base',
      name: 'Renamed',
      image: '/sprites/tile-variants/generated/base/a.png',
      transform: { x: 20, y: 30, size: 60 },
      color: 'red',
      decorations: {},
    };

    const reverted = toRevertedDefault(customised);

    expect(reverted).toMatchObject({ id: 'default-base-red', type: 'base', color: 'red', name: 'Default', image: null, transform: CENTRED_TRANSFORM });
    expect(reverted.decorations).toBeUndefined();
  });
});

describe('toDecorationEditorHref', () => {
  it('links to the decoration editor with the variant preselected', () => {
    const variant = { id: 'base-red-archery', type: 'base', name: 'archery', image: null, transform: CENTRED_TRANSFORM, color: 'red' } as TileVariant;
    expect(toDecorationEditorHref(variant)).toBe('/testbed/tile-decoration-editor?state=Editor&art=base-red-archery');
  });
});

describe('hasUnsavedChanges', () => {
  const saved = { id: 'special-fire', type: 'special', name: 'fire', image: null, transform: CENTRED_TRANSFORM, color: null } as TileVariant;

  it('is false when the draft matches the saved variant', () => {
    expect(hasUnsavedChanges({ ...saved }, saved)).toBe(false);
  });

  it('is true when the draft was edited', () => {
    expect(hasUnsavedChanges({ ...saved, name: 'renamed' }, saved)).toBe(true);
  });

  it('is true for a variant that is not saved yet', () => {
    expect(hasUnsavedChanges({ ...saved }, undefined)).toBe(true);
  });
});
