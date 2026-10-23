import { cva } from 'class-variance-authority';
import type { PixelButtonSize, PixelButtonVariant, PixelButtonVisual } from './PixelButton.types';

const rootBase =
  'relative inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed';

// The art has a thick lower lip, so its face centre sits above the box centre. Bottom-heavy
// padding lifts the centred label (and the loading dots) onto the face. Measured on the sheets
// (PIL): 3-slice and 9-slice face centre is 8 px above the box centre (default: 24 of 64;
// large: H/2 - 7.5); icon art (64 px drawn from 128) is 2 px above.
const opticalPadding = {
  default: 'pb-4',
  large: 'pt-2 pb-6',
  'icon-round': 'pb-1',
  'icon-square': 'pb-1',
} as const satisfies Record<PixelButtonSize, string>; // tunable

const root = cva(rootBase, {
  variants: {
    size: {
      // Sprite default: the label (2nd child, after the art) stays on one line; the button grows with it,
      // and a forced narrow width clips the label inside the art instead of spilling out.
      default: `h-16 min-w-[128px] px-6 ${opticalPadding.default} [&>span:nth-of-type(2)]:block [&>span:nth-of-type(2)]:min-w-0 [&>span:nth-of-type(2)]:max-w-full [&>span:nth-of-type(2)]:overflow-hidden [&>span:nth-of-type(2)]:whitespace-nowrap [&>span:nth-of-type(2)]:text-ellipsis`,
      large: `min-h-[128px] min-w-[128px] px-6 ${opticalPadding.large}`,
      'icon-round': `h-12 w-12 p-0 ${opticalPadding['icon-round']}`,
      'icon-square': `h-12 w-12 p-0 ${opticalPadding['icon-square']}`,
    } satisfies Record<PixelButtonSize, string>,
  },
  defaultVariants: { size: 'default' },
});

const label = cva('relative inline-flex items-center gap-2 font-pixel text-lg text-ink', {
  variants: {
    visual: {
      regular: '',
      hover: '',
      pressed: 'translate-y-[2px]',
      disabled: 'opacity-70',
    } satisfies Record<PixelButtonVisual, string>,
    loading: { true: 'invisible', false: '' },
  },
  defaultVariants: { visual: 'regular', loading: false },
});

export const styles = {
  root,
  label,
  // Pressed art sits 4 px lower; the label moves only 2 px so it stays on the face.
  artStack: (isPressed: boolean) =>
    isPressed ? 'pointer-events-none absolute inset-0 translate-y-1' : 'pointer-events-none absolute inset-0',
  // Neutral uses the shared Hover art for every non-disabled state, so brightness tells hover and pressed apart.
  artTint: (variant: PixelButtonVariant, visual: PixelButtonVisual): string => {
    if (variant !== 'neutral') return '';
    if (visual === 'hover') return 'brightness-110';
    return visual === 'pressed' ? 'brightness-90' : '';
  },
  sliceLayer: 'absolute inset-0',
  // 64 px art drawn in a 48 px box: 8 px bleed each side keeps the hit area at 48x48.
  iconLayer: 'absolute -inset-2 bg-no-repeat [image-rendering:pixelated]',
  iconDisabled: 'opacity-50',
  loadingDots: (size: PixelButtonSize) =>
    `absolute inset-0 grid place-items-center font-pixel text-lg text-ink ${opticalPadding[size]}`,
} as const;
