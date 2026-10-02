import { findPreview, previews } from './registry';

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('testbed registry', () => {
  it('gives every preview a unique kebab-case slug', () => {
    const slugs = previews.map((preview) => preview.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    slugs.forEach((slug) => expect(slug).toMatch(KEBAB_CASE));
  });

  it('gives every preview at least one state, with unique state names', () => {
    previews.forEach((preview) => {
      const stateNames = preview.states.map((state) => state.name);

      expect(stateNames.length).toBeGreaterThan(0);
      expect(new Set(stateNames).size).toBe(stateNames.length);
    });
  });

  it('finds a preview by slug and returns undefined for unknown slugs', () => {
    const [firstPreview] = previews;

    expect(findPreview(firstPreview.slug)).toBe(firstPreview);
    expect(findPreview('no-such-preview')).toBeUndefined();
  });
});
