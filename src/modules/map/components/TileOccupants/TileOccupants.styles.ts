import { cva } from 'class-variance-authority';

export const styles = {
  container: 'absolute inset-0 z-30 pointer-events-none',
  // 27% of T. Flush-anchored by slotStyle's two 24% offset edges (OCCUPANT_CORNER_SLOTS), so the
  // knight stands beside its boat's corner on land and never shares the boat's center point.
  // Transform stays off the slot: slotStyle sets an inline transform that would override scale-90.
  slot: cva('absolute w-[27%] h-[27%]', {
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
