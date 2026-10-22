import { cva } from 'class-variance-authority';
import type { PixelButtonSize, PixelButtonVariant, PixelButtonVisual } from './PixelButton.types';

const rootBase =
  'relative inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed';

const root = cva(rootBase, {
  variants: {
    size: {
      default: 'h-16 min-w-[128px] px-6',
      large: 'min-h-[128px] min-w-[128px] px-6 py-4',
      'icon-round': 'h-12 w-12 p-0',
      'icon-square': 'h-12 w-12 p-0',
    } satisfies Record<PixelButtonSize, string>,
  },
  defaultVariants: { size: 'default' },
});

const label = cva('relative inline-flex items-center gap-2 text-lg font-semibold text-ink', {
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
  loadingDots: 'absolute inset-0 grid place-items-center text-lg font-semibold text-ink',
} as const;
