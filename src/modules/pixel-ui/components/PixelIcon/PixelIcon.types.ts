export type PixelIconColorName =
  | 'hammer'
  | 'wood'
  | 'gold'
  | 'food'
  | 'attack'
  | 'close'
  | 'settings'
  | 'info'
  | 'music';

export type PixelIconGreyName =
  | 'grey-close'
  | 'grey-settings'
  | 'grey-sound'
  | 'grey-one'
  | 'grey-two'
  | 'grey-three'
  | 'grey-cart'
  | 'grey-plus'
  | 'grey-minus'
  | 'grey-unlock';

export type PixelIconName = PixelIconColorName | PixelIconGreyName;
/** 32 px (0.5x) | 64 px (1x). */
export type PixelIconSize = 'sm' | 'lg';
/** Only grey icons have states. */
export type PixelIconState = 'regular' | 'pressed' | 'disabled';

export interface PixelIconProps {
  name: PixelIconName;
  size?: PixelIconSize;
  state?: PixelIconState;
  label?: string;
  className?: string;
}

export interface IconSource {
  url: string;
  px: 32 | 64;
}
