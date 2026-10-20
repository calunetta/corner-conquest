import { resolveIcon, toIconTransform } from './resolve-icon';
import overridesConfig from './icon-overrides.config.json';
import type { IconOverride } from './icon-registry.types';

// The resolver captures the overrides object at import time, so the mock factory returns one
// object that the tests mutate. The real file is `{}` today; keeping it empty here makes the
// "no override" cases independent of whatever a user saves later.
jest.mock('./icon-overrides.config.json', () => ({}));

// Every real registry entry defaults to an image today; a fixture lucide entry keeps the lucide
// branch covered, since an entry can still be switched back to a glyph.
jest.mock('./icon-registry.config.json', () => [
  ...jest.requireActual('./icon-registry.config.json'),
  {
    id: 'test-lucide',
    label: 'Test Lucide',
    module: 'legacy',
    defaultSource: { kind: 'lucide', name: 'Loader2' },
    defaultRotation: 0,
    defaultSize: 100,
  },
]);

const mutableOverrides = overridesConfig as Record<string, IconOverride>;

const REGISTRY_IMAGE_ID = 'icon-fight';
const REGISTRY_IMAGE_SRC = '/sprites/icon_fight.png';
const REGISTRY_LUCIDE_ID = 'test-lucide';
const REGISTRY_LUCIDE_NAME = 'Loader2';
const UPLOADED_SRC = '/uploads/icon-custom.png';
const DEFAULT_TRANSFORM = 'rotate(0deg) scale(1)';

function setOverride(id: string, override: IconOverride): void {
  mutableOverrides[id] = override;
}

afterEach(() => {
  for (const id of Object.keys(mutableOverrides)) {
    delete mutableOverrides[id];
  }
});

describe('toIconTransform', () => {
  it.each([
    [0, 100, 'rotate(0deg) scale(1)'],
    [45, 50, 'rotate(45deg) scale(0.5)'],
    [90, 200, 'rotate(90deg) scale(2)'],
    [359, 25, 'rotate(359deg) scale(0.25)'],
    [0, 150, 'rotate(0deg) scale(1.5)'],
  ])('rotation %p and size %p → "%s"', (rotation, size, expected) => {
    expect(toIconTransform(rotation, size)).toBe(expected);
  });
});

describe('resolveIcon', () => {
  describe('image entry, no override', () => {
    it('returns the registry image source and the default transform', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID)).toEqual({
        source: { kind: 'image', src: REGISTRY_IMAGE_SRC },
        transform: DEFAULT_TRANSFORM,
      });
    });
  });

  describe('image entry, override with rotation and size only', () => {
    beforeEach(() => {
      setOverride(REGISTRY_IMAGE_ID, { rotation: 45, size: 50 });
    });

    it('keeps the registry image source', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).source).toEqual({
        kind: 'image',
        src: REGISTRY_IMAGE_SRC,
      });
    });

    it('applies the override rotation and size to the transform', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).transform).toBe('rotate(45deg) scale(0.5)');
    });
  });

  describe('image entry, override with src only', () => {
    beforeEach(() => {
      setOverride(REGISTRY_IMAGE_ID, { src: UPLOADED_SRC });
    });

    it('returns the override src as an image source instead of the registry default', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).source).toEqual({ kind: 'image', src: UPLOADED_SRC });
    });

    it('falls back to the registry default transform', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).transform).toBe(DEFAULT_TRANSFORM);
    });
  });

  describe('image entry, override with src, rotation and size', () => {
    beforeEach(() => {
      setOverride(REGISTRY_IMAGE_ID, { src: UPLOADED_SRC, rotation: 270, size: 125 });
    });

    it('returns the override src and the override transform together', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID)).toEqual({
        source: { kind: 'image', src: UPLOADED_SRC },
        transform: 'rotate(270deg) scale(1.25)',
      });
    });
  });

  describe('image entry, override with an empty src', () => {
    beforeEach(() => {
      setOverride(REGISTRY_IMAGE_ID, { src: '' });
    });

    it('treats the empty src as no upload and keeps the registry image source', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).source).toEqual({
        kind: 'image',
        src: REGISTRY_IMAGE_SRC,
      });
    });
  });

  describe('lucide entry, no override', () => {
    it('returns the registry lucide name as the source and the default transform', () => {
      expect(resolveIcon(REGISTRY_LUCIDE_ID)).toEqual({
        source: { kind: 'lucide', name: REGISTRY_LUCIDE_NAME },
        transform: DEFAULT_TRANSFORM,
      });
    });
  });

  describe('lucide entry, override with rotation and size only', () => {
    beforeEach(() => {
      setOverride(REGISTRY_LUCIDE_ID, { rotation: 90, size: 200 });
    });

    it('keeps the registry lucide source', () => {
      expect(resolveIcon(REGISTRY_LUCIDE_ID).source).toEqual({
        kind: 'lucide',
        name: REGISTRY_LUCIDE_NAME,
      });
    });

    it('applies the override rotation and size to the transform', () => {
      expect(resolveIcon(REGISTRY_LUCIDE_ID).transform).toBe('rotate(90deg) scale(2)');
    });
  });

  describe('lucide entry, override with src only', () => {
    beforeEach(() => {
      setOverride(REGISTRY_LUCIDE_ID, { src: UPLOADED_SRC });
    });

    it('replaces the lucide default with the uploaded image source', () => {
      expect(resolveIcon(REGISTRY_LUCIDE_ID).source).toEqual({ kind: 'image', src: UPLOADED_SRC });
    });

    it('falls back to the registry default transform', () => {
      expect(resolveIcon(REGISTRY_LUCIDE_ID).transform).toBe(DEFAULT_TRANSFORM);
    });
  });

  describe('invalid id', () => {
    it.each([
      ['an id absent from the registry', 'icon-does-not-exist'],
      ['the empty string', ''],
      ['an inherited Object property name', 'constructor'],
    ])('throws for %s', (_label, id) => {
      expect(() => resolveIcon(id)).toThrow(`Unknown icon id "${id}"`);
    });
  });
});
