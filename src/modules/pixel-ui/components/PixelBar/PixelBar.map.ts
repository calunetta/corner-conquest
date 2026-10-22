import { assetUrl } from '../../asset-url';
import type { BarArt, BarFill, PixelBarSize } from './PixelBar.types';

const BARS_DIR = 'UI Elements/UI Elements/Bars';

const BAR_SHEET_SIZE = { width: 320, height: 64 } as const;

// Spans measured with PIL: opaque caps and the tileable centre; gaps between are transparent.
export const BAR_ART: Record<PixelBarSize, BarArt> = {
  big: {
    sheet: {
      url: assetUrl(`${BARS_DIR}/BigBar_Base.png`),
      ...BAR_SHEET_SIZE,
      cols: [
        { start: 40, size: 24 },
        { start: 128, size: 64 },
        { start: 256, size: 24 },
      ],
      rows: [{ start: 9, size: 51 }],
      inset: { top: 11, right: 11, bottom: 16, left: 11 }, // tunable
    },
    fillUrl: assetUrl(`${BARS_DIR}/BigBar_Fill.png`),
    trackHeight: 24, // tunable
  },
  small: {
    sheet: {
      url: assetUrl(`${BARS_DIR}/SmallBar_Base.png`),
      ...BAR_SHEET_SIZE,
      cols: [
        { start: 49, size: 15 },
        { start: 128, size: 64 },
        { start: 256, size: 15 },
      ],
      rows: [{ start: 22, size: 19 }],
      inset: { top: 8, right: 10, bottom: 8, left: 10 }, // tunable
    },
    fillUrl: assetUrl(`${BARS_DIR}/SmallBar_Fill.png`),
    trackHeight: 3, // tunable
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toBarFill(value: number, max: number): BarFill {
  const valueMax = Number.isFinite(max) ? Math.max(max, 0) : 0;
  const valueNow = Number.isFinite(value) ? clamp(value, 0, valueMax) : 0;
  const fraction = valueMax > 0 ? valueNow / valueMax : 0;
  return { fraction, valueNow, valueMax };
}
