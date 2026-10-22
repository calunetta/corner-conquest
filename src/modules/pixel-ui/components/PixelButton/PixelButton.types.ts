import type { ButtonHTMLAttributes } from 'react';
import type { NineSliceSheet, ThreeSliceSheet } from '../../pixel-ui.types';

export type PixelButtonVariant = 'primary' | 'danger' | 'neutral';
export type PixelButtonSize = 'default' | 'large' | 'icon-round' | 'icon-square';
export type PixelButtonVisual = 'regular' | 'hover' | 'pressed' | 'disabled';

/** Handlers `usePixelButtonVisual` wraps; consumer handlers run first, then the hook's own. */
export type HookedHandlers =
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onPointerCancel'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onBlur';

export type ConsumerHandlers = Pick<ButtonHTMLAttributes<HTMLButtonElement>, HookedHandlers>;

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
  handlers: ConsumerHandlers;
}
