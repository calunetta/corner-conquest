import { existsSync } from 'fs';
import path from 'path';
import type { PanelVariant } from './PixelPanel.types';
import { toPanelSpec } from './PixelPanel.map';
import type { SliceSpan } from '../../pixel-ui.types';
import { assetUrl } from '../../asset-url';

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public');

const VARIANTS: PanelVariant[] = ['wood', 'banner', 'paper', 'special', 'carved'];

const SHEET_PATHS: Record<PanelVariant, string> = {
  wood: 'UI Elements/UI Elements/Wood Table/WoodTable.png',
  banner: 'UI Elements/UI Elements/Banners/Banner.png',
  paper: 'UI Elements/UI Elements/Papers/RegularPaper.png',
  special: 'UI Elements/UI Elements/Papers/SpecialPaper.png',
  carved: 'UI/Banners/Carved_9Slides.png',
};

// Measured opaque spans per variant (plan.md Contracts). Spans are fixed; only insets are tunable.
const EXPECTED_SPANS: Record<PanelVariant, { cols: SliceSpan[]; rows: SliceSpan[] }> = {
  wood: {
    cols: [{ start: 44, size: 84 }, { start: 192, size: 64 }, { start: 320, size: 84 }],
    rows: [{ start: 43, size: 85 }, { start: 192, size: 64 }, { start: 320, size: 103 }],
  },
  banner: {
    cols: [{ start: 28, size: 100 }, { start: 192, size: 64 }, { start: 320, size: 84 }],
    rows: [{ start: 60, size: 68 }, { start: 192, size: 64 }, { start: 320, size: 111 }],
  },
  paper: {
    cols: [{ start: 12, size: 52 }, { start: 128, size: 64 }, { start: 256, size: 52 }],
    rows: [{ start: 20, size: 44 }, { start: 128, size: 64 }, { start: 256, size: 45 }],
  },
  special: {
    cols: [{ start: 9, size: 55 }, { start: 128, size: 64 }, { start: 256, size: 55 }],
    rows: [{ start: 20, size: 44 }, { start: 128, size: 64 }, { start: 256, size: 43 }],
  },
  carved: {
    cols: [{ start: 2, size: 62 }, { start: 64, size: 64 }, { start: 128, size: 63 }],
    rows: [{ start: 1, size: 63 }, { start: 64, size: 64 }, { start: 128, size: 63 }],
  },
};

describe('toPanelSpec', () => {
  it.each([
    ['wood', 256, 256],
    ['banner', 256, 256],
    ['paper', 128, 128],
    ['special', 128, 128],
    ['carved', 126, 126],
  ] as const)('sets the minimum size of %s to %i x %i', (variant, minWidth, minHeight) => {
    const spec = toPanelSpec(variant);

    expect(spec.minWidth).toBe(minWidth);
    expect(spec.minHeight).toBe(minHeight);
  });

  it.each([
    ['banner', 'ink'],
    ['paper', 'ink'],
    ['wood', 'light'],
    ['special', 'light'],
    ['carved', 'ink'],
  ] as const)('uses the %s text tone %s', (variant, textTone) => {
    expect(toPanelSpec(variant).textTone).toBe(textTone);
  });
});

describe.each(VARIANTS)('%s sheet', (variant) => {
  const sheet = toPanelSpec(variant).sheet;

  it('uses the measured column and row spans', () => {
    expect(sheet.cols).toEqual(EXPECTED_SPANS[variant].cols);
    expect(sheet.rows).toEqual(EXPECTED_SPANS[variant].rows);
  });

  it('is a square sheet', () => {
    expect(sheet.width).toBe(sheet.height);
  });

  it('keeps every column and row span inside the sheet', () => {
    for (const span of [...sheet.cols, ...sheet.rows]) {
      expect(span.start).toBeGreaterThanOrEqual(0);
      expect(span.size).toBeGreaterThan(0);
    }
    for (const span of sheet.cols) {
      expect(span.start + span.size).toBeLessThanOrEqual(sheet.width);
    }
    for (const span of sheet.rows) {
      expect(span.start + span.size).toBeLessThanOrEqual(sheet.height);
    }
  });

  it('keeps the column and row spans in order and non-overlapping', () => {
    for (const spans of [sheet.cols, sheet.rows]) {
      for (let index = 1; index < spans.length; index += 1) {
        expect(spans[index].start).toBeGreaterThanOrEqual(spans[index - 1].start + spans[index - 1].size);
      }
    }
  });

  it('has whole, non-negative pixel values on every inset edge', () => {
    // Insets are tunable (plan.md Decisions); only their shape is a contract.
    for (const edge of [sheet.inset.top, sheet.inset.right, sheet.inset.bottom, sheet.inset.left]) {
      expect(Number.isInteger(edge)).toBe(true);
      expect(edge).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses the exact sheet url for its variant', () => {
    expect(sheet.url).toBe(assetUrl(SHEET_PATHS[variant]));
  });

  it('produces a url that decodes to an existing file under public/', () => {
    expect(existsSync(path.join(PUBLIC_DIR, decodeURI(sheet.url)))).toBe(true);
  });
});
