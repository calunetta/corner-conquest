import type { ThreeSliceSheet } from '../../pixel-ui.types';

export type PixelBarSize = 'big' | 'small';

export interface PixelBarProps {
  value: number;
  max: number;
  size?: PixelBarSize;
  /** Visible text over the bar, e.g. '7/10'. */
  label?: string;
  'aria-label': string;
  className?: string;
}

/** The base sheet is a 3-slice frame; its `inset` is the frame padding around the track box that holds the fill. */
export interface BarArt {
  sheet: ThreeSliceSheet;
  fillUrl: string;
  /** Height in px at 1x of the fill/track band. */
  trackHeight: number;
  /** Height in px of the fill sheet image. */
  fillSheetHeight: number;
  /** Px to shift the 64 px fill sheet up so its centred opaque band sits in the track. */
  fillOffsetY: number;
}

export interface BarFill {
  fraction: number;
  valueNow: number;
  valueMax: number;
}
