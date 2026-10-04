import { toVisibleDecorations, FIXED_ROCK_LAYOUT, FIXED_CLOUD_LAYOUT } from './MapDecorations.map';

describe('MapDecorations.map', () => {
  describe('toVisibleDecorations', () => {
    it('returns full layout when isMobile=false', () => {
      const result = toVisibleDecorations(false);

      expect(result.rocks).toHaveLength(FIXED_ROCK_LAYOUT.length);
      expect(result.rocks).toEqual(FIXED_ROCK_LAYOUT);
      expect(result.clouds).toHaveLength(FIXED_CLOUD_LAYOUT.length);
      expect(result.clouds).toEqual(FIXED_CLOUD_LAYOUT);
    });

    it('filters out desktopOnly rocks when isMobile=true', () => {
      const result = toVisibleDecorations(true);

      const mobileRocks = result.rocks;

      // Verify no desktopOnly rocks are in the result
      expect(mobileRocks).not.toEqual(FIXED_ROCK_LAYOUT);
      expect(mobileRocks.some((r) => r.desktopOnly)).toBe(false);

      // Verify all non-desktopOnly rocks are present
      const nonDesktopRocks = FIXED_ROCK_LAYOUT.filter((r) => !r.desktopOnly);
      expect(mobileRocks).toHaveLength(nonDesktopRocks.length);
      expect(mobileRocks).toEqual(nonDesktopRocks);
    });

    it('filters out desktopOnly clouds when isMobile=true', () => {
      const result = toVisibleDecorations(true);

      const mobileClouds = result.clouds;

      // Verify no desktopOnly clouds are in the result
      expect(mobileClouds).not.toEqual(FIXED_CLOUD_LAYOUT);
      expect(mobileClouds.some((c) => c.desktopOnly)).toBe(false);

      // Verify all non-desktopOnly clouds are present
      const nonDesktopClouds = FIXED_CLOUD_LAYOUT.filter((c) => !c.desktopOnly);
      expect(mobileClouds).toHaveLength(nonDesktopClouds.length);
      expect(mobileClouds).toEqual(nonDesktopClouds);
    });

    it('preserves input arrays when filtering (pure function)', () => {
      const originalRocks = [...FIXED_ROCK_LAYOUT];
      const originalClouds = [...FIXED_CLOUD_LAYOUT];

      toVisibleDecorations(true);

      // Verify the static arrays weren't mutated
      expect(FIXED_ROCK_LAYOUT).toEqual(originalRocks);
      expect(FIXED_CLOUD_LAYOUT).toEqual(originalClouds);
    });
  });
});
