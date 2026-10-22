import { existsSync } from 'fs';
import path from 'path';
import type { RibbonColor } from './Ribbon.types';
import { RIBBON_INSET, toRibbonSheet } from './Ribbon.map';

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public');

const COLORS: RibbonColor[] = ['blue', 'red', 'yellow'];

describe('toRibbonSheet', () => {
  it.each([
    ['blue', '/tiny-swords/UI/Ribbons/Ribbon_Blue_3Slides.png'],
    ['red', '/tiny-swords/UI/Ribbons/Ribbon_Red_3Slides.png'],
    ['yellow', '/tiny-swords/UI/Ribbons/Ribbon_Yellow_3Slides.png'],
  ] as const)('maps the %s ribbon to its sheet url', (color, expectedUrl) => {
    expect(toRibbonSheet(color).url).toBe(expectedUrl);
  });

  it.each(COLORS)('uses the 192x64 sheet geometry for %s', (color) => {
    const sheet = toRibbonSheet(color);

    expect(sheet.width).toBe(192);
    expect(sheet.height).toBe(64);
    expect(sheet.rows).toEqual([{ start: 0, size: 61 }]);
  });

  it.each(COLORS)('uses the measured opaque column spans for %s', (color) => {
    expect(toRibbonSheet(color).cols).toEqual([
      { start: 3, size: 61 },
      { start: 64, size: 64 },
      { start: 128, size: 61 },
    ]);
  });

  it.each(COLORS)('keeps every span inside the sheet and in order for %s', (color) => {
    const sheet = toRibbonSheet(color);

    sheet.cols.forEach((span, index) => {
      expect(span.start).toBeGreaterThanOrEqual(0);
      expect(span.start + span.size).toBeLessThanOrEqual(sheet.width);
      if (index > 0) {
        expect(span.start).toBeGreaterThanOrEqual(sheet.cols[index - 1].start + sheet.cols[index - 1].size);
      }
    });
    sheet.rows.forEach((span) => {
      expect(span.start + span.size).toBeLessThanOrEqual(sheet.height);
    });
  });

  it.each(COLORS)('gives %s the shared ribbon inset', (color) => {
    expect(toRibbonSheet(color).inset).toBe(RIBBON_INSET);
  });

  it.each(COLORS)('produces a url that decodes to an existing file for %s', (color) => {
    const url = toRibbonSheet(color).url;

    expect(existsSync(path.join(PUBLIC_DIR, decodeURI(url)))).toBe(true);
  });
});

describe('RIBBON_INSET', () => {
  // Values are tunable (plan.md Decisions); only their shape is a contract.
  it('has whole, non-negative pixel values on every edge', () => {
    for (const edge of [RIBBON_INSET.top, RIBBON_INSET.right, RIBBON_INSET.bottom, RIBBON_INSET.left]) {
      expect(Number.isInteger(edge)).toBe(true);
      expect(edge).toBeGreaterThanOrEqual(0);
    }
  });
});
