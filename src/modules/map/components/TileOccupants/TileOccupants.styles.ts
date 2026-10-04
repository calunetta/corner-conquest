import { cva } from 'class-variance-authority';

export const styles = {
  container: 'absolute inset-0 z-30 pointer-events-none',
  occupantSlot: 'absolute w-1/2 h-1/2',
  image: cva('absolute h-auto w-full max-w-[86px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] bottom-0 right-0', {
    variants: {
      isFaded: {
        true: 'opacity-50',
        false: 'opacity-100',
      },
    },
  }),
} as const;
