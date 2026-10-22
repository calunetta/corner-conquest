import { assetUrl } from './asset-url';
import { toSliceGrid } from './slice.map';
import type { NineSliceSheet, SliceSheet, ThreeSliceSheet } from './pixel-ui.types';

// toSliceGrid does not read `inset`; it is set to zero here on purpose.
const NO_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

// Opaque spans measured on WoodTable.png (448x448), see plan.md Contracts.
const WOOD_TABLE: NineSliceSheet = {
  url: assetUrl('UI Elements/UI Elements/Wood Table/WoodTable.png'),
  width: 448,
  height: 448,
  inset: NO_INSET,
  cols: [
    { start: 44, size: 84 },
    { start: 192, size: 64 },
    { start: 320, size: 84 },
  ],
  rows: [
    { start: 43, size: 85 },
    { start: 192, size: 64 },
    { start: 320, size: 103 },
  ],
};

// Opaque spans of Ribbon_Blue_3Slides.png (192x64), see plan.md Contracts.
const RIBBON: ThreeSliceSheet = {
  url: assetUrl('UI/Ribbons/Ribbon_Blue_3Slides.png'),
  width: 192,
  height: 64,
  inset: NO_INSET,
  cols: [
    { start: 3, size: 61 },
    { start: 64, size: 64 },
    { start: 128, size: 61 },
  ],
  rows: [{ start: 0, size: 61 }],
};

const WOOD_TABLE_URL_CSS = 'url("/tiny-swords/UI%20Elements/UI%20Elements/Wood%20Table/WoodTable.png")';

describe('toSliceGrid, 9-slice WoodTable at scale 1', () => {
  const grid = toSliceGrid(WOOD_TABLE, 1);

  it('sizes the fixed corner tracks and the stretching middle track', () => {
    expect(grid.columns).toBe('84px 1fr 84px');
    expect(grid.rows).toBe('85px 1fr 103px');
  });

  it('reports the minimum size from the corner tracks and no fixed height', () => {
    expect(grid.minWidth).toBe(168);
    expect(grid.minHeight).toBe(188);
    expect(grid.fixedHeight).toBeNull();
  });

  it('produces nine cells in row-major order', () => {
    expect(grid.cells.map((cell) => cell.key)).toEqual([
      'r0c0', 'r0c1', 'r0c2',
      'r1c0', 'r1c1', 'r1c2',
      'r2c0', 'r2c1', 'r2c2',
    ]);
  });

  it('sizes and positions the top-left corner from its source span', () => {
    expect(grid.cells[0].style).toEqual({
      backgroundImage: WOOD_TABLE_URL_CSS,
      backgroundSize: '533.3333333333333% 527.0588235294117%',
      backgroundPosition: '12.087912087912088% 11.84573002754821%',
    });
  });

  it('centres the middle cell at 50% on both axes', () => {
    expect(grid.cells[4].style).toEqual({
      backgroundImage: WOOD_TABLE_URL_CSS,
      backgroundSize: '700% 700%',
      backgroundPosition: '50% 50%',
    });
  });

  it('sizes and positions the bottom-right corner from its source span', () => {
    expect(grid.cells[8].style).toEqual({
      backgroundImage: WOOD_TABLE_URL_CSS,
      backgroundSize: '533.3333333333333% 434.9514563106796%',
      backgroundPosition: '87.91208791208791% 92.7536231884058%',
    });
  });
});

describe('toSliceGrid, scale', () => {
  const scale1 = toSliceGrid(WOOD_TABLE, 1);
  const scale2 = toSliceGrid(WOOD_TABLE, 2);

  it('doubles track sizes and minimums at scale 2', () => {
    expect(scale2.columns).toBe('168px 1fr 168px');
    expect(scale2.rows).toBe('170px 1fr 206px');
    expect(scale2.minWidth).toBe(336);
    expect(scale2.minHeight).toBe(376);
  });

  it('keeps every cell percentage identical at scale 2', () => {
    expect(scale2.cells).toEqual(scale1.cells);
  });
});

describe('toSliceGrid, 3-slice ribbon at scale 1', () => {
  const grid = toSliceGrid(RIBBON, 1);

  it('uses a single fixed-height row', () => {
    expect(grid.columns).toBe('61px 1fr 61px');
    expect(grid.rows).toBe('61px');
    expect(grid.fixedHeight).toBe(61);
    expect(grid.minHeight).toBe(61);
    expect(grid.minWidth).toBe(122);
  });

  it('produces three cells, row-major', () => {
    expect(grid.cells.map((cell) => cell.key)).toEqual(['r0c0', 'r0c1', 'r0c2']);
  });

  it('gives each ribbon cell its exact size and a vertical position of 0%', () => {
    expect(grid.cells[0].style).toEqual({
      backgroundImage: `url("${RIBBON.url}")`,
      backgroundSize: '314.75409836065575% 104.91803278688525%',
      backgroundPosition: '2.2900763358778624% 0%',
    });
    expect(grid.cells[1].style).toEqual({
      backgroundImage: `url("${RIBBON.url}")`,
      backgroundSize: '300% 104.91803278688525%',
      backgroundPosition: '50% 0%',
    });
    expect(grid.cells[2].style).toEqual({
      backgroundImage: `url("${RIBBON.url}")`,
      backgroundSize: '314.75409836065575% 104.91803278688525%',
      backgroundPosition: '97.70992366412213% 0%',
    });
  });

  it('doubles the ribbon fixed height and minimum at scale 2 without changing its percentages', () => {
    const scale2 = toSliceGrid(RIBBON, 2);

    expect(scale2.rows).toBe('122px');
    expect(scale2.fixedHeight).toBe(122);
    expect(scale2.minHeight).toBe(122);
    expect(scale2.minWidth).toBe(244);
    expect(scale2.cells).toEqual(grid.cells);
  });
});

describe('toSliceGrid, boundaries', () => {
  it('uses 0% position and 100% size when a span covers the whole sheet axis', () => {
    const fullSheet: ThreeSliceSheet = {
      url: assetUrl('full.png'),
      width: 64,
      height: 64,
      inset: NO_INSET,
      cols: [
        { start: 0, size: 64 },
        { start: 0, size: 64 },
        { start: 0, size: 64 },
      ],
      rows: [{ start: 0, size: 64 }],
    };

    const cell = toSliceGrid(fullSheet, 1).cells[0];

    expect(cell.style.backgroundSize).toBe('100% 100%');
    expect(cell.style.backgroundPosition).toBe('0% 0%');
  });

  it('uses 100% size and 0% position on the full-span axis only, percentages on the other', () => {
    const halfFullSheet: ThreeSliceSheet = {
      url: assetUrl('half.png'),
      width: 64,
      height: 448,
      inset: NO_INSET,
      cols: [
        { start: 0, size: 64 },
        { start: 0, size: 64 },
        { start: 0, size: 64 },
      ],
      rows: [{ start: 100, size: 103 }],
    };

    const cell = toSliceGrid(halfFullSheet, 1).cells[0];

    expect(cell.style.backgroundSize).toBe('100% 434.9514563106796%');
    expect(cell.style.backgroundPosition).toBe('0% 28.985507246376812%');
  });

  it('never emits NaN or Infinity for valid sheets', () => {
    const sheets: SliceSheet[] = [WOOD_TABLE, RIBBON];

    for (const sheet of sheets) {
      for (const scale of [1, 2] as const) {
        const serialized = JSON.stringify(toSliceGrid(sheet, scale));

        expect(serialized).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('does not mutate the sheet it reads', () => {
    const before = JSON.stringify(WOOD_TABLE);

    toSliceGrid(WOOD_TABLE, 2);

    expect(JSON.stringify(WOOD_TABLE)).toBe(before);
  });
});
