import type { ButtonHTMLAttributes } from 'react';
import type { NineSliceSheet, ThreeSliceSheet } from '../../pixel-ui.types';

export type PixelButtonVariant = 'primary' | 'danger';
export type PixelButtonSize = 'default' | 'large' | 'icon-round' | 'icon-square';
export type PixelButtonVisual = 'regular' | 'hover' | 'pressed' | 'disabled';

/** Handlers owned by `usePixelButtonVisual`; consumers cannot attach them. */
export type HookedHandlers =
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onPointerCancel'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onBlur';

export interface PixelButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, HookedHandlers> {
  variant?: PixelButtonVariant;
  size?: PixelButtonSize;
  loading?: boolean;
}

export type PixelButtonArt =
  | { kind: 'three'; sheets: Record<PixelButtonVisual, ThreeSliceSheet> }
  | { kind: 'nine'; sheets: Record<PixelButtonVisual, NineSliceSheet> }
  | { kind: 'icon'; urls: Record<PixelButtonVisual, string> };

export interface PixelButtonVisualState {
  visual: PixelButtonVisual;
  handlers: Pick<ButtonHTMLAttributes<HTMLButtonElement>, HookedHandlers>;
}
