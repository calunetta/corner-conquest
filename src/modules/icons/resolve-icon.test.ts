import { resolveIcon, toIconTransform } from './resolve-icon';
import overridesConfig from './icon-overrides.config.json';
import type { IconOverride } from './icon-registry.types';

// The resolver captures the overrides object at import time, so the mock factory returns one
// object that the tests mutate. The real file is `{}` today; keeping it empty here makes the
// "no override" cases independent of whatever a user saves later.
jest.mock('./icon-overrides.config.json', () => ({}));

const mutableOverrides = overridesConfig as Record<string, IconOverride>;

const REGISTRY_IMAGE_ID = 'icon-fight';
const REGISTRY_IMAGE_SRC = '/sprites/icon_fight.png';
const REGISTRY_LUCIDE_ID = 'loader-2';
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
  describe('known image id, no override', () => {
    it('returns the registry default src and the default transform', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID)).toEqual({
        src: REGISTRY_IMAGE_SRC,
        transform: DEFAULT_TRANSFORM,
      });
    });
  });

  describe('known image id, override with rotation and size only', () => {
    beforeEach(() => {
      setOverride(REGISTRY_IMAGE_ID, { rotation: 45, size: 50 });
    });

    it('keeps the registry default src', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).src).toBe(REGISTRY_IMAGE_SRC);
    });

    it('applies the override rotation and size to the transform', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).transform).toBe('rotate(45deg) scale(0.5)');
    });
  });

  describe('known image id, override with src only', () => {
    const UPLOADED_SRC = '/uploads/icon-fight-custom.png';

    beforeEach(() => {
      setOverride(REGISTRY_IMAGE_ID, { src: UPLOADED_SRC });
    });

    it('returns the override src instead of the registry default', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).src).toBe(UPLOADED_SRC);
    });

    it('falls back to the registry default transform', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID).transform).toBe(DEFAULT_TRANSFORM);
    });
  });

  describe('known image id, override with src, rotation and size', () => {
    const UPLOADED_SRC = '/uploads/icon-fight-custom.png';

    beforeEach(() => {
      setOverride(REGISTRY_IMAGE_ID, { src: UPLOADED_SRC, rotation: 270, size: 125 });
    });

    it('returns the override src and the override transform together', () => {
      expect(resolveIcon(REGISTRY_IMAGE_ID)).toEqual({
        src: UPLOADED_SRC,
        transform: 'rotate(270deg) scale(1.25)',
      });
    });
  });

  describe('invalid id', () => {
    it.each([
      ['an id absent from the registry', 'icon-does-not-exist'],
      ['the empty string', ''],
    ])('throws for %s', (_label, id) => {
      expect(() => resolveIcon(id)).toThrow(`Unknown icon id "${id}"`);
    });
  });

  describe('registry entry of kind lucide', () => {
    it('throws because this resolver only resolves image icons', () => {
      expect(() => resolveIcon(REGISTRY_LUCIDE_ID)).toThrow(
        `Icon "${REGISTRY_LUCIDE_ID}" is a lucide icon; resolveIcon only resolves image icons`,
      );
    });
  });
});
