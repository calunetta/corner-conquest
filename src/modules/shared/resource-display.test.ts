import { getResourceDisplayName, RESOURCE_SPRITES } from './resource-display';
import { ResourceType } from '@/lib/types';

describe('resource-display', () => {
  describe('getResourceDisplayName', () => {
    it.each([
      [ResourceType.Food, 'Food'],
      [ResourceType.Wood, 'Wood'],
      [ResourceType.Gold, 'Gold'],
    ])('returns %s for %s', (type, expected) => {
      expect(getResourceDisplayName(type)).toBe(expected);
    });

    it('returns the type string for unknown types', () => {
      const unknown = 'unknown' as unknown as typeof ResourceType[keyof typeof ResourceType];
      expect(getResourceDisplayName(unknown)).toBe('unknown');
    });
  });

  describe('RESOURCE_SPRITES', () => {
    it('has sprites for all resource types', () => {
      expect(RESOURCE_SPRITES[ResourceType.Food]).toBe('/sprites/sheep.gif');
      expect(RESOURCE_SPRITES[ResourceType.Wood]).toBe('/sprites/tree.gif');
      expect(RESOURCE_SPRITES[ResourceType.Gold]).toBe('/sprites/gold.gif');
    });

    it('contains exactly three entries', () => {
      const keys = Object.keys(RESOURCE_SPRITES);
      expect(keys).toHaveLength(3);
    });
  });
});
