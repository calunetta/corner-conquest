import { toVisibleDecorations, FIXED_ROCK_LAYOUT, FIXED_CLOUD_LAYOUT } from './MapDecorations.map';

describe('MapDecorations.map', () => {
  describe('FIXED_CLOUD_LAYOUT', () => {
    it('has 56 cloud entries (48 original + 8 corner-to-edge gap fillers)', () => {
      expect(FIXED_CLOUD_LAYOUT).toHaveLength(56);
    });

    it('has a unique id on every cloud entry', () => {
      const ids = FIXED_CLOUD_LAYOUT.map((cloud) => cloud.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps every gap filler visible on mobile (not desktopOnly)', () => {
      const gapFillerIds = [
        'cloud-t0', 'cloud-t8', 'cloud-b0', 'cloud-b8',
        'cloud-l0', 'cloud-l8', 'cloud-r0', 'cloud-r8',
      ];
      const mobileClouds = toVisibleDecorations(true).clouds;
      const mobileIds = mobileClouds.map((cloud) => cloud.id);

      gapFillerIds.forEach((id) => {
        expect(FIXED_CLOUD_LAYOUT.some((cloud) => cloud.id === id)).toBe(true);
        expect(mobileIds).toContain(id);
      });
    });
  });

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

    it('shows exactly 48 clouds on mobile (32 always-visible originals, 8 un-flagged mid-edge, 8 gap fillers)', () => {
      expect(toVisibleDecorations(true).clouds).toHaveLength(48);
    });

    it('shows all 56 clouds on desktop', () => {
      expect(toVisibleDecorations(false).clouds).toHaveLength(56);
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
