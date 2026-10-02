import type { ComponentPreview } from '../../testbed.types';
import { groupPreviews, isRowActive, isIndexRoute, pluralizeStates } from './TestbedSidebar.map';

const createPreview = (title: string, group: string, stateCount = 1): ComponentPreview => ({
  slug: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  group,
  states: Array.from({ length: stateCount }, (_, i) => ({
    name: `State ${i + 1}`,
    render: () => null,
  })),
});

describe('TestbedSidebar.map', () => {
  describe('groupPreviews', () => {
    it('returns no groups when there are no previews', () => {
      expect(groupPreviews([])).toEqual([]);
    });

    it('groups previews and sorts groups and titles alphabetically', () => {
      const groups = groupPreviews([
        createPreview('Zoom bar', 'Map'),
        createPreview('Dice tray', 'Combat'),
        createPreview('Fog overlay', 'Map'),
      ]);

      expect(groups.map((group) => group.name)).toEqual(['Combat', 'Map']);
      expect(groups[1].previews.map((preview) => preview.title)).toEqual(['Fog overlay', 'Zoom bar']);
    });
  });

  describe('isRowActive', () => {
    it.each([
      ['/testbed/foo', 'foo', true],
      ['/testbed/foo/', 'foo', true],
      ['/testbed/foo', 'bar', false],
      ['/testbed', 'foo', false],
      ['/testbed/', 'foo', false],
    ])('isRowActive(%s, %s) → %s', (pathname, slug, expected) => {
      expect(isRowActive(pathname, slug)).toBe(expected);
    });
  });

  describe('isIndexRoute', () => {
    it.each([
      ['/testbed', true],
      ['/testbed/', true],
      ['/testbed/foo', false],
      ['/testbed/foo/', false],
      ['/other', false],
    ])('isIndexRoute(%s) → %s', (pathname, expected) => {
      expect(isIndexRoute(pathname)).toBe(expected);
    });
  });

  describe('pluralizeStates', () => {
    it.each([
      [0, '0 states'],
      [1, '1 state'],
      [2, '2 states'],
      [5, '5 states'],
      [100, '100 states'],
    ])('pluralizeStates(%d) → %s', (count, expected) => {
      expect(pluralizeStates(count)).toBe(expected);
    });
  });
});
