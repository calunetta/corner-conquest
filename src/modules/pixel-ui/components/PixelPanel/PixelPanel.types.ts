import type { ComponentPropsWithoutRef } from 'react';
import type { NineSliceSheet } from '../../pixel-ui.types';
import type { RibbonColor } from '../Ribbon/Ribbon.types';

export type PanelVariant = 'wood' | 'banner' | 'paper' | 'special' | 'carved';
export type PanelPadding = 'none' | 'sm' | 'md';

export interface PixelPanelProps extends ComponentPropsWithoutRef<'div'> {
  variant?: PanelVariant;
  /** Renders a Ribbon straddling the top edge. */
  title?: string;
  titleColor?: RibbonColor;
  titleAs?: 'h2' | 'h3';
  /** Added inside the frame inset: none = no padding, sm = p-2, md = p-4. */
  padding?: PanelPadding;
  /** Extra classes for the outer wrapper; `className` still goes to the frame. */
  rootClassName?: string;
}

export interface PanelSpec {
  sheet: NineSliceSheet;
  minWidth: number;
  minHeight: number;
  textTone: 'ink' | 'light';
}
