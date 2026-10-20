import * as lucide from 'lucide-react';
import { getLucideGlyph } from './lucide-glyphs';
import iconRegistryJson from './icon-registry.config.json';
import type { IconRegistryEntry } from './icon-registry.types';

// jest.setup.js replaces lucide-react with a Proxy that returns a new stub component on every
// property read, so identity checks would never hold. Unmock it here to compare against the real
// glyph exports.
jest.unmock('lucide-react');

const iconRegistry = iconRegistryJson as IconRegistryEntry[];

describe('getLucideGlyph', () => {
  it('returns the lucide component for a known export name', () => {
    expect(getLucideGlyph('Swords')).toBe(lucide.Swords);
  });

  it.each(['Loader2', 'Skull', 'ZoomOut'])('resolves the export named "%s"', (name) => {
    expect(getLucideGlyph(name)).toBe(lucide[name as keyof typeof lucide]);
  });

  it.each([
    ['an unknown export name', 'NotARealExport'],
    ['the empty string', ''],
    ['an inherited Object property name', 'constructor'],
    ['a lowercase registry id instead of an export name', 'swords'],
  ])('returns undefined for %s', (_label, name) => {
    expect(getLucideGlyph(name)).toBeUndefined();
  });

  // Guard: a new `kind: 'lucide'` entry in icon-registry.config.json must also be added to the
  // static map in lucide-glyphs.ts, or the editor and the game render nothing for it.
  // A plain loop, not it.each: the list is empty while every registry entry defaults to an image.
  it('resolves every registry lucide name to its real export', () => {
    for (const name of registryLucideNames()) {
      expect(lucide[name as keyof typeof lucide]).toBeDefined();
      expect(getLucideGlyph(name)).toBe(lucide[name as keyof typeof lucide]);
    }
  });
});

function registryLucideNames(): string[] {
  return iconRegistry.flatMap((entry) =>
    entry.defaultSource.kind === 'lucide' ? [entry.defaultSource.name] : [],
  );
}
