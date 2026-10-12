import { cva } from 'class-variance-authority';

export const styles = {
  titleRow: 'flex items-center gap-3',
  icon: cva('h-6 w-6 shrink-0', {
    variants: {
      isExpiring: {
        true: 'text-destructive animate-pulse motion-reduce:animate-none',
        false: 'text-amber-400',
      },
    },
  }),
  // Steps down below the sm breakpoint so "Taking over in 0:18" stays on one line in a 390px dialog.
  countdown: cva('text-2xl sm:text-4xl font-bold font-mono', {
    variants: {
      isExpiring: {
        true: 'text-destructive animate-pulse motion-reduce:animate-none',
        false: 'text-amber-400',
      },
    },
  }),
  // Full-width tap target on mobile; natural width, right-aligned by the footer, from sm up.
  dismissButton: 'w-full sm:w-auto',
  dismissIcon: cva('mr-2 h-4 w-4', {
    variants: {
      isPending: {
        true: 'animate-spin motion-reduce:animate-none',
        false: '',
      },
    },
  }),
} as const;
