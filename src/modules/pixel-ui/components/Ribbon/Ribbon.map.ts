import { assetUrl } from '../../asset-url';
import type { FrameInset, ThreeSliceSheet } from '../../pixel-ui.types';
import type { RibbonColor } from './Ribbon.types';

const SHEET_WIDTH = 192;
const SHEET_HEIGHT = 64;

/**
 * Space between the ribbon edge and its text. Measured on the 3-slice sheets (PIL): the flat face
 * spans x 38 px in from each end and rows 3..44, so the face centre is row ~23 of the 61 px band.
 * Left/right keep 12 px clear of the face outline (38 + 12). Top/bottom put the centre of the
 * 20 px text line at row 22: two px above the face centre, to offset the thick lower lip.
 */
export const RIBBON_INSET: FrameInset = { top: 12, right: 50, bottom: 14, left: 50 }; // tunable

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
