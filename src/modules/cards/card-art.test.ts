import fs from 'fs';
import path from 'path';
import { ABILITY_ART, CARD_ART } from './card-art';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const allArt = [...Object.entries(CARD_ART), ...Object.entries(ABILITY_ART)];

describe('card art catalog', () => {
  it.each(allArt)('%s has an icon and a card image on disk', (_name, art) => {
    expect(fs.existsSync(path.join(PUBLIC_DIR, art.icon))).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_DIR, art.card))).toBe(true);
  });

  it.each(allArt)('%s serves its icon and card image as .webp', (_name, art) => {
    expect(art.icon).toMatch(/\.webp$/);
    expect(art.card).toMatch(/\.webp$/);
  });

  it('gives every card and ability its own images', () => {
    const paths = allArt.flatMap(([, art]) => [art.icon, art.card]);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
