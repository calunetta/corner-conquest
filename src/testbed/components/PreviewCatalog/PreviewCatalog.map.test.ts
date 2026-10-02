import type { ComponentPreview } from '../../testbed.types';
import { groupPreviews } from './PreviewCatalog.map';

const createPreview = (title: string, group: string): ComponentPreview => ({
  slug: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  group,
  states: [{ name: 'Default', render: () => null }],
});

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
