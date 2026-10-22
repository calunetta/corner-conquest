import type { SliceCell, SliceGrid, SliceScale, SliceSheet, SliceSpan } from './pixel-ui.types';

const PERCENT = 100;

/** Percent `background-position` that puts `start` at the cell origin; 0 when the span is the whole axis (avoids 0/0). */
function toPositionPercent(start: number, total: number, size: number): number {
  if (total === size) return 0;
  return (start / (total - size)) * PERCENT;
}

function toSizePercent(total: number, size: number): number {
  return (total / size) * PERCENT;
}

function toCell(sheet: SliceSheet, rowIndex: number, colIndex: number): SliceCell {
  const col = sheet.cols[colIndex];
  const row: SliceSpan = sheet.rows[rowIndex];

  return {
    key: `r${rowIndex}c${colIndex}`,
    style: {
      backgroundImage: `url("${sheet.url}")`,
      backgroundSize: `${toSizePercent(sheet.width, col.size)}% ${toSizePercent(sheet.height, row.size)}%`,
      backgroundPosition: `${toPositionPercent(col.start, sheet.width, col.size)}% ${toPositionPercent(row.start, sheet.height, row.size)}%`,
    },
  };
}

/** Builds the CSS grid of a sliced frame: fixed-size outer tracks, stretching middle track, one cell per slice. */
export function toSliceGrid(sheet: SliceSheet, scale: SliceScale): SliceGrid {
  const [left, , right] = sheet.cols;
  const isThreeSlice = sheet.rows.length === 1;
  const rowTracks = isThreeSlice
    ? [`${sheet.rows[0].size * scale}px`]
    : [`${sheet.rows[0].size * scale}px`, '1fr', `${sheet.rows[2].size * scale}px`];

  const cells = sheet.rows.flatMap((_, rowIndex) =>
    sheet.cols.map((__, colIndex) => toCell(sheet, rowIndex, colIndex)),
  );

  const fixedHeight = isThreeSlice ? sheet.rows[0].size * scale : null;
  const minHeight = isThreeSlice
    ? sheet.rows[0].size * scale
    : (sheet.rows[0].size + sheet.rows[2].size) * scale;

  return {
    columns: `${left.size * scale}px 1fr ${right.size * scale}px`,
    rows: rowTracks.join(' '),
    cells,
    minWidth: (left.size + right.size) * scale,
    minHeight,
    fixedHeight,
  };
}
