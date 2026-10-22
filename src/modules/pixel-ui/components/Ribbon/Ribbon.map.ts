import { assetUrl } from '../../asset-url';
import type { FrameInset, ThreeSliceSheet } from '../../pixel-ui.types';
import type { RibbonColor } from './Ribbon.types';

const SHEET_WIDTH = 192;
const SHEET_HEIGHT = 64;

/** Space between the ribbon edge and its text. */
export const RIBBON_INSET: FrameInset = { top: 14, right: 56, bottom: 12, left: 56 }; // tunable

const RIBBON_FILE_COLOR: Record<RibbonColor, string> = {
  blue: 'Blue',
  red: 'Red',
  yellow: 'Yellow',
};

export function toRibbonSheet(color: RibbonColor): ThreeSliceSheet {
  return {
    url: assetUrl(`UI/Ribbons/Ribbon_${RIBBON_FILE_COLOR[color]}_3Slides.png`),
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
    cols: [
      { start: 3, size: 61 },
      { start: 64, size: 64 },
      { start: 128, size: 61 },
    ],
    rows: [{ start: 0, size: 61 }],
    inset: RIBBON_INSET,
  };
}
