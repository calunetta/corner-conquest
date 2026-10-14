import { cva } from 'class-variance-authority';

export const styles = {
  container: 'absolute inset-0 z-30 pointer-events-none',
  // Flush-anchored by slotStyle's offset edges (OCCUPANT_CORNER_SLOTS); size comes from
  // OCCUPANT_SIZE via that same inline slotStyle (island-tile-slots.types.ts), not a class here.
  slot: cva('absolute', {
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
