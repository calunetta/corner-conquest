import { existsSync } from 'fs';
import path from 'path';
import { BAR_ART, toBarFill } from './PixelBar.map';

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public');

const toDiskPath = (url: string): string => path.join(PUBLIC_DIR, decodeURI(url));

describe('toBarFill', () => {
  it.each([
    ['7 of 10', 7, 10, 0.7, 7, 10],
    ['empty', 0, 10, 0, 0, 10],
    ['full', 10, 10, 1, 10, 10],
    ['value above max clamps to max', 15, 10, 1, 10, 10],
    ['negative value clamps to zero', -3, 10, 0, 0, 10],
    ['max of zero gives an empty bar', 5, 0, 0, 0, 0],
    ['negative max is treated as zero', 5, -4, 0, 0, 0],
    ['NaN value reads as zero', NaN, 10, 0, 0, 10],
    ['NaN max is treated as zero', 5, NaN, 0, 0, 0],
    // KNOWN current behaviour (not a spec): non-finite value reads as 0, not clamped to max.
    ['Infinity value reads as zero', Infinity, 10, 0, 0, 10],
    // KNOWN current behaviour (not a spec): non-finite max is treated as 0.
    ['Infinity max is treated as zero', 5, Infinity, 0, 0, 0],
  ])('%s: value %p of max %p', (_label, value, max, fraction, valueNow, valueMax) => {
    expect(toBarFill(value, max)).toEqual({ fraction, valueNow, valueMax });
  });
});

describe('BAR_ART', () => {
  const SIZES = ['big', 'small'] as const;

  it.each([
    ['big', '/tiny-swords/UI%20Elements/UI%20Elements/Bars/BigBar_Base.png', '/tiny-swords/UI%20Elements/UI%20Elements/Bars/BigBar_Fill.png'],
    ['small', '/tiny-swords/UI%20Elements/UI%20Elements/Bars/SmallBar_Base.png', '/tiny-swords/UI%20Elements/UI%20Elements/Bars/SmallBar_Fill.png'],
  ] as const)('%s size uses the exact base sheet and fill sheet URLs', (size, sheetUrl, fillUrl) => {
    expect(BAR_ART[size].sheet.url).toBe(sheetUrl);
    expect(BAR_ART[size].fillUrl).toBe(fillUrl);
  });

  it.each(SIZES)('%s sheet is the 320x64 base sheet', (size) => {
    expect(BAR_ART[size].sheet.width).toBe(320);
    expect(BAR_ART[size].sheet.height).toBe(64);
  });

  it.each(SIZES)('%s column and row spans sit inside the sheet and are ordered', (size) => {
    const { sheet } = BAR_ART[size];

    for (const span of sheet.cols) {
      expect(span.start).toBeGreaterThanOrEqual(0);
      expect(span.size).toBeGreaterThan(0);
      expect(span.start + span.size).toBeLessThanOrEqual(sheet.width);
    }
    for (const span of sheet.rows) {
      expect(span.start).toBeGreaterThanOrEqual(0);
      expect(span.size).toBeGreaterThan(0);
      expect(span.start + span.size).toBeLessThanOrEqual(sheet.height);
    }
    for (let i = 1; i < sheet.cols.length; i++) {
      expect(sheet.cols[i].start).toBeGreaterThanOrEqual(sheet.cols[i - 1].start + sheet.cols[i - 1].size);
    }
  });

  it.each(SIZES)('%s inset values are whole non-negative numbers', (size) => {
    const { top, right, bottom, left } = BAR_ART[size].sheet.inset;

    for (const value of [top, right, bottom, left]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(SIZES)('%s trackHeight is a positive whole number', (size) => {
    const { trackHeight } = BAR_ART[size];

    expect(Number.isInteger(trackHeight)).toBe(true);
    expect(trackHeight).toBeGreaterThan(0);
  });

  it.each(SIZES)('%s base and fill sheets exist on disk', (size) => {
    expect(existsSync(toDiskPath(BAR_ART[size].sheet.url))).toBe(true);
    expect(existsSync(toDiskPath(BAR_ART[size].fillUrl))).toBe(true);
  });
});
