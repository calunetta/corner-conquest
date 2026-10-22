import { existsSync } from 'fs';
import path from 'path';
import { toButtonArt } from './PixelButton.map';
import type { PixelButtonSize, PixelButtonVariant, PixelButtonVisual } from './PixelButton.types';

const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public');

const toDiskPath = (url: string): string => path.join(PUBLIC_DIR, decodeURI(url));

const VISUALS: PixelButtonVisual[] = ['regular', 'hover', 'pressed', 'disabled'];

// Exact URLs from plan.md Contracts (PixelButton). Spaces are encoded as %20.
const SLICE_PREFIX = '/tiny-swords/UI/Buttons/';
const ICON_PREFIX = '/tiny-swords/UI%20Elements/UI%20Elements/Buttons/';

describe('toButtonArt: default size (3-slice)', () => {
  it.each([
    ['primary', 'Blue'],
    ['danger', 'Red'],
  ] as const)('%s variant uses the %s tone for regular and pressed', (variant, tone) => {
    const art = toButtonArt(variant, 'default');

    expect(art.kind).toBe('three');
    if (art.kind !== 'three') return;
    expect(art.sheets.regular.url).toBe(`${SLICE_PREFIX}Button_${tone}_3Slides.png`);
    expect(art.sheets.pressed.url).toBe(`${SLICE_PREFIX}Button_${tone}_3Slides_Pressed.png`);
  });

  it.each(['primary', 'danger'] as const)('%s variant shares hover and disabled art across tones', (variant) => {
    const art = toButtonArt(variant, 'default');

    if (art.kind !== 'three') throw new Error('expected a three-slice button');
    expect(art.sheets.hover.url).toBe(`${SLICE_PREFIX}Button_Hover_3Slides.png`);
    expect(art.sheets.disabled.url).toBe(`${SLICE_PREFIX}Button_Disable_3Slides.png`);
  });

  it('sheets are 192x64 with three 64 px columns and one row', () => {
    const art = toButtonArt('primary', 'default');

    if (art.kind !== 'three') throw new Error('expected a three-slice button');
    for (const visual of VISUALS) {
      const sheet = art.sheets[visual];
      expect(sheet.width).toBe(192);
      expect(sheet.height).toBe(64);
      expect(sheet.cols).toEqual([
        { start: 0, size: 64 },
        { start: 64, size: 64 },
        { start: 128, size: 64 },
      ]);
      expect(sheet.rows).toEqual([{ start: 0, size: 64 }]);
    }
  });

  // Tunable (PixelButton.map.ts): only the shape is asserted, not the numbers.
  it('inset is four non-negative whole numbers', () => {
    const art = toButtonArt('primary', 'default');

    if (art.kind !== 'three') throw new Error('expected a three-slice button');
    for (const value of Object.values(art.sheets.regular.inset)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('toButtonArt: large size (9-slice)', () => {
  it.each([
    ['primary', 'Blue'],
    ['danger', 'Red'],
  ] as const)('%s variant uses the %s tone for regular and pressed', (variant, tone) => {
    const art = toButtonArt(variant, 'large');

    expect(art.kind).toBe('nine');
    if (art.kind !== 'nine') return;
    expect(art.sheets.regular.url).toBe(`${SLICE_PREFIX}Button_${tone}_9Slides.png`);
    expect(art.sheets.pressed.url).toBe(`${SLICE_PREFIX}Button_${tone}_9Slides_Pressed.png`);
  });

  it.each(['primary', 'danger'] as const)('%s variant shares hover and disabled art across tones', (variant) => {
    const art = toButtonArt(variant, 'large');

    if (art.kind !== 'nine') throw new Error('expected a nine-slice button');
    expect(art.sheets.hover.url).toBe(`${SLICE_PREFIX}Button_Hover_9Slides.png`);
    expect(art.sheets.disabled.url).toBe(`${SLICE_PREFIX}Button_Disable_9Slides.png`);
  });

  it('sheets are 192x192 with three 64 px columns and three 64 px rows', () => {
    const art = toButtonArt('danger', 'large');

    if (art.kind !== 'nine') throw new Error('expected a nine-slice button');
    for (const visual of VISUALS) {
      const sheet = art.sheets[visual];
      expect(sheet.width).toBe(192);
      expect(sheet.height).toBe(192);
      expect(sheet.cols).toEqual([
        { start: 0, size: 64 },
        { start: 64, size: 64 },
        { start: 128, size: 64 },
      ]);
      expect(sheet.rows).toEqual([
        { start: 0, size: 64 },
        { start: 64, size: 64 },
        { start: 128, size: 64 },
      ]);
    }
  });

  // Tunable (PixelButton.map.ts): only the shape is asserted, not the numbers.
  it('inset is four non-negative whole numbers', () => {
    const art = toButtonArt('danger', 'large');

    if (art.kind !== 'nine') throw new Error('expected a nine-slice button');
    for (const value of Object.values(art.sheets.regular.inset)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('toButtonArt: icon sizes', () => {
  it.each([
    ['icon-round', 'primary', 'SmallBlueRoundButton'],
    ['icon-square', 'primary', 'SmallBlueSquareButton'],
    ['icon-round', 'danger', 'SmallRedRoundButton'],
    ['icon-square', 'danger', 'SmallRedSquareButton'],
  ] as const)('%s on %s variant: regular, hover and disabled use the Regular file', (size, variant, base) => {
    const art = toButtonArt(variant, size);

    expect(art.kind).toBe('icon');
    if (art.kind !== 'icon') return;
    const regular = `${ICON_PREFIX}${base}_Regular.png`;
    expect(art.urls.regular).toBe(regular);
    expect(art.urls.hover).toBe(regular);
    expect(art.urls.disabled).toBe(regular);
  });

  it.each([
    ['icon-round', 'primary', 'SmallBlueRoundButton'],
    ['icon-square', 'primary', 'SmallBlueSquareButton'],
    ['icon-round', 'danger', 'SmallRedRoundButton'],
    ['icon-square', 'danger', 'SmallRedSquareButton'],
  ] as const)('%s on %s variant: pressed uses the Pressed file', (size, variant, base) => {
    const art = toButtonArt(variant, size);

    if (art.kind !== 'icon') throw new Error('expected an icon button');
    expect(art.urls.pressed).toBe(`${ICON_PREFIX}${base}_Pressed.png`);
  });

});

describe('toButtonArt: neutral variant (3-slice and 9-slice)', () => {
  it.each(['default', 'large'] as const)('%s size: regular, hover and pressed all use the hover plate', (size) => {
    const art = toButtonArt('neutral', size);

    if (art.kind === 'icon') throw new Error('expected a sliced button');
    const suffix = size === 'default' ? '3Slides' : '9Slides';
    const hoverPlate = `${SLICE_PREFIX}Button_Hover_${suffix}.png`;
    expect(art.sheets.regular.url).toBe(hoverPlate);
    expect(art.sheets.hover.url).toBe(hoverPlate);
    expect(art.sheets.pressed.url).toBe(hoverPlate);
  });

  it.each(['default', 'large'] as const)('%s size: disabled uses the disable plate', (size) => {
    const art = toButtonArt('neutral', size);

    if (art.kind === 'icon') throw new Error('expected a sliced button');
    const suffix = size === 'default' ? '3Slides' : '9Slides';
    expect(art.sheets.disabled.url).toBe(`${SLICE_PREFIX}Button_Disable_${suffix}.png`);
  });

  it('neutral 3-slice keeps the 192x64 geometry', () => {
    const art = toButtonArt('neutral', 'default');

    if (art.kind !== 'three') throw new Error('expected a three-slice button');
    for (const visual of VISUALS) {
      expect(art.sheets[visual].width).toBe(192);
      expect(art.sheets[visual].height).toBe(64);
    }
  });

  it('neutral 9-slice keeps the 192x192 geometry', () => {
    const art = toButtonArt('neutral', 'large');

    if (art.kind !== 'nine') throw new Error('expected a nine-slice button');
    for (const visual of VISUALS) {
      expect(art.sheets[visual].width).toBe(192);
      expect(art.sheets[visual].height).toBe(192);
    }
  });

  it.each([
    ['icon-round', 'SmallBlueRoundButton'],
    ['icon-square', 'SmallBlueSquareButton'],
  ] as const)('%s: regular, hover and disabled use the blue Regular file', (size, base) => {
    const art = toButtonArt('neutral', size);

    if (art.kind !== 'icon') throw new Error('expected an icon button');
    const regular = `${ICON_PREFIX}${base}_Regular.png`;
    expect(art.urls.regular).toBe(regular);
    expect(art.urls.hover).toBe(regular);
    expect(art.urls.disabled).toBe(regular);
  });

  it.each([
    ['icon-round', 'SmallBlueRoundButton'],
    ['icon-square', 'SmallBlueSquareButton'],
  ] as const)('%s: pressed uses the blue Pressed file', (size, base) => {
    const art = toButtonArt('neutral', size);

    if (art.kind !== 'icon') throw new Error('expected an icon button');
    expect(art.urls.pressed).toBe(`${ICON_PREFIX}${base}_Pressed.png`);
  });
});

describe('toButtonArt: every produced url exists on disk', () => {
  const VARIANTS: PixelButtonVariant[] = ['primary', 'danger', 'neutral'];
  const SIZES: PixelButtonSize[] = ['default', 'large', 'icon-round', 'icon-square'];

  it.each(
    VARIANTS.flatMap((variant) => SIZES.map((size) => [variant, size] as const)),
  )('%s variant, %s size', (variant, size) => {
    const art = toButtonArt(variant, size);
    const urls =
      art.kind === 'icon'
        ? VISUALS.map((visual) => art.urls[visual])
        : VISUALS.map((visual) => art.sheets[visual].url);

    for (const url of urls) {
      expect(existsSync(toDiskPath(url))).toBe(true);
    }
  });
});
