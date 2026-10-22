import { assetUrl } from '../../asset-url';
import type { FrameInset, NineSliceSheet, ThreeSliceSheet } from '../../pixel-ui.types';
import type {
  PixelButtonArt,
  PixelButtonSize,
  PixelButtonVariant,
  PixelButtonVisual,
} from './PixelButton.types';

const SLICE_DIR = 'UI/Buttons';
const ICON_DIR = 'UI Elements/UI Elements/Buttons';
const SLICE_SIZE = 192;
const THIRD = 64;

const TONE: Record<PixelButtonVariant, 'Blue' | 'Red'> = {
  primary: 'Blue',
  danger: 'Red',
  neutral: 'Blue', // only used by icon sizes: the pack has no neutral icon sheet
};

const THREE_INSET: FrameInset = { top: 0, right: 16, bottom: 8, left: 16 }; // tunable
const NINE_INSET: FrameInset = { top: 8, right: 16, bottom: 16, left: 16 }; // tunable

const COLS = [
  { start: 0, size: THIRD },
  { start: THIRD, size: THIRD },
  { start: THIRD * 2, size: THIRD },
] as const;

/** Hover and disabled art is shared by both tones; neutral reuses the hover plate for every state but disabled. */
function toSliceFile(
  visual: PixelButtonVisual,
  variant: PixelButtonVariant,
  slides: '3Slides' | '9Slides',
): string {
  if (visual === 'disabled') return `Button_Disable_${slides}.png`;
  if (visual === 'hover' || variant === 'neutral') return `Button_Hover_${slides}.png`;
  const pressed = visual === 'pressed' ? '_Pressed' : '';
  return `Button_${TONE[variant]}_${slides}${pressed}.png`;
}

function toSheets<T>(build: (visual: PixelButtonVisual) => T): Record<PixelButtonVisual, T> {
  return {
    regular: build('regular'),
    hover: build('hover'),
    pressed: build('pressed'),
    disabled: build('disabled'),
  };
}

function toThreeSheet(url: string): ThreeSliceSheet {
  return {
    url,
    width: SLICE_SIZE,
    height: THIRD,
    cols: COLS,
    rows: [{ start: 0, size: THIRD }],
    inset: THREE_INSET,
  };
}

function toNineSheet(url: string): NineSliceSheet {
  return {
    url,
    width: SLICE_SIZE,
    height: SLICE_SIZE,
    cols: COLS,
    rows: [
      { start: 0, size: THIRD },
      { start: THIRD, size: THIRD },
      { start: THIRD * 2, size: THIRD },
    ],
    inset: NINE_INSET,
  };
}

function toIconFile(
  tone: string,
  shape: 'Round' | 'Square',
  visual: PixelButtonVisual,
): string {
  const state = visual === 'pressed' ? 'Pressed' : 'Regular';
  return `${ICON_DIR}/Small${tone}${shape}Button_${state}.png`;
}

export function toButtonArt(variant: PixelButtonVariant, size: PixelButtonSize): PixelButtonArt {
  if (size === 'default') {
    return {
      kind: 'three',
      sheets: toSheets((visual) => toThreeSheet(assetUrl(`${SLICE_DIR}/${toSliceFile(visual, variant, '3Slides')}`))),
    };
  }
  if (size === 'large') {
    return {
      kind: 'nine',
      sheets: toSheets((visual) => toNineSheet(assetUrl(`${SLICE_DIR}/${toSliceFile(visual, variant, '9Slides')}`))),
    };
  }
  const shape = size === 'icon-round' ? 'Round' : 'Square';
  return { kind: 'icon', urls: toSheets((visual) => assetUrl(toIconFile(TONE[variant], shape, visual))) };
}
