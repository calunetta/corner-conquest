import { assetUrl } from '../../asset-url';
import type {
  IconSource,
  PixelIconColorName,
  PixelIconGreyName,
  PixelIconName,
  PixelIconSize,
  PixelIconState,
} from './PixelIcon.types';

const COLOR_ICON_NUMBER: Record<PixelIconColorName, string> = {
  hammer: '01',
  wood: '02',
  gold: '03',
  food: '04',
  attack: '05',
  close: '09',
  settings: '10',
  info: '11',
  music: '12',
};

const GREY_ICON_NUMBER: Record<PixelIconGreyName, string> = {
  'grey-close': '01',
  'grey-settings': '02',
  'grey-sound': '03',
  'grey-one': '04',
  'grey-two': '05',
  'grey-three': '06',
  'grey-cart': '07',
  'grey-plus': '08',
  'grey-minus': '09',
  'grey-unlock': '10',
};

const GREY_STATE_PREFIX: Record<PixelIconState, string> = {
  regular: 'Regular',
  pressed: 'Pressed',
  disabled: 'Disable',
};

const ICON_PX: Record<PixelIconSize, 32 | 64> = { sm: 32, lg: 64 };

function toIconUrl(name: PixelIconName, state: PixelIconState): string | null {
  if (Object.hasOwn(COLOR_ICON_NUMBER, name)) {
    const number = COLOR_ICON_NUMBER[name as PixelIconColorName];
    return assetUrl(`UI Elements/UI Elements/Icons/Icon_${number}.png`);
  }
  if (Object.hasOwn(GREY_ICON_NUMBER, name)) {
    const number = GREY_ICON_NUMBER[name as PixelIconGreyName];
    return assetUrl(`UI/Icons/${GREY_STATE_PREFIX[state]}_${number}.png`);
  }
  return null;
}

export function toIconSource(
  name: PixelIconName,
  size: PixelIconSize,
  state: PixelIconState,
): IconSource | null {
  const url = toIconUrl(name, state);
  if (!url) return null;
  return { url, px: ICON_PX[size] };
}
