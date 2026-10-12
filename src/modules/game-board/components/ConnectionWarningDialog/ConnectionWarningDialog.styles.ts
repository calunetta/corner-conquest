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
  countdown: cva('text-4xl font-bold font-mono', {
    variants: {
      isExpiring: {
        true: 'text-destructive animate-pulse motion-reduce:animate-none',
        false: 'text-amber-400',
      },
    },
  }),
} as const;
