import { assetUrl } from '../../asset-url';
import type { FrameInset, NineSliceSheet, SliceSpan } from '../../pixel-ui.types';
import type { PanelSpec, PanelVariant } from './PixelPanel.types';

type Spans = readonly [SliceSpan, SliceSpan, SliceSpan];

const span = (start: number, size: number): SliceSpan => ({ start, size });
const evenInset = (all: number): FrameInset => ({ top: all, right: all, bottom: all, left: all });

interface SheetOptions {
  path: string;
  size: number;
  cols: Spans;
  rows: Spans;
  inset: FrameInset;
}

const toSheet = ({ path, size, cols, rows, inset }: SheetOptions): NineSliceSheet => ({
  url: assetUrl(path),
  width: size,
  height: size,
  cols,
  rows,
  inset,
});

// Spans are measured opaque runs of each sheet (fixed). Insets are tunable.
export const PANEL_SPECS: Record<PanelVariant, PanelSpec> = {
  wood: {
    sheet: toSheet({
      path: 'UI Elements/UI Elements/Wood Table/WoodTable.png',
      size: 448,
      cols: [span(44, 84), span(192, 64), span(320, 84)],
      rows: [span(43, 85), span(192, 64), span(320, 103)],
      inset: { top: 40, right: 40, bottom: 56, left: 40 }, // tunable
    }),
    minWidth: 256,
    minHeight: 256,
    textTone: 'light',
  },
  banner: {
    sheet: toSheet({
      path: 'UI Elements/UI Elements/Banners/Banner.png',
      size: 448,
      cols: [span(28, 100), span(192, 64), span(320, 84)],
      rows: [span(60, 68), span(192, 64), span(320, 111)],
      inset: { top: 48, right: 36, bottom: 56, left: 36 }, // tunable
    }),
    minWidth: 256,
    minHeight: 256,
    textTone: 'ink',
  },
  paper: {
    sheet: toSheet({
      path: 'UI Elements/UI Elements/Papers/RegularPaper.png',
      size: 320,
      cols: [span(12, 52), span(128, 64), span(256, 52)],
      rows: [span(20, 44), span(128, 64), span(256, 45)],
      inset: evenInset(16), // tunable
    }),
    minWidth: 128,
    minHeight: 128,
    textTone: 'ink',
  },
  special: {
    sheet: toSheet({
      path: 'UI Elements/UI Elements/Papers/SpecialPaper.png',
      size: 320,
      cols: [span(9, 55), span(128, 64), span(256, 55)],
      rows: [span(20, 44), span(128, 64), span(256, 43)],
      inset: evenInset(16), // tunable
    }),
    minWidth: 128,
    minHeight: 128,
    textTone: 'light',
  },
  carved: {
    sheet: toSheet({
      path: 'UI/Banners/Carved_9Slides.png',
      size: 192,
      cols: [span(2, 62), span(64, 64), span(128, 63)],
      rows: [span(1, 63), span(64, 64), span(128, 63)],
      inset: evenInset(12), // tunable
    }),
    // Art-driven floor: the 9-slice corners (62+63 wide, 63+63 tall) cannot render smaller.
    minWidth: 126,
    minHeight: 126,
    textTone: 'ink',
  },
};

export function toPanelSpec(variant: PanelVariant): PanelSpec {
  return PANEL_SPECS[variant];
}
