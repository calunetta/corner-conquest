import { cva } from 'class-variance-authority';

export const styles = {
  container: 'absolute inset-0 z-30 pointer-events-none',
  // 29% of T (about 70% of the boat's 42%). Centered on the same corner as the boat via
  // slotStyle, so the rider's box always sits inside the boat's box.
  // Transform stays off the slot: slotStyle sets an inline transform that would override scale-90.
  slot: cva('absolute w-[29%] h-[29%]', {
    variants: {
      isOverflow: {
        true: 'opacity-90',
        false: '',
      },
    },
  }),
  image: cva('object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]', {
    variants: {
      isFaded: {
        true: 'opacity-50',
        false: 'opacity-100',
      },
      isOverflow: {
        true: 'scale-90',
        false: '',
      },
    },
  }),
} as const;
