import { cva } from 'class-variance-authority';

export const styles = {
  root: 'pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-xl bg-black/70 p-2 sm:px-3 sm:py-2 text-center shadow-xl backdrop-blur-md border border-white/10 select-none',
  waitingWrapper: 'flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-400',
  hourglassIcon: 'h-4 w-4 animate-spin [animation-duration:8s]',
  playingWrapper: 'flex items-center gap-2',
  turnText: 'text-xs sm:text-sm font-bold text-foreground',
  countdownBadge: cva('text-xs font-mono font-bold flex items-center gap-1 transition-colors', {
    variants: {
      isExpiring: {
        true: 'bg-destructive/20 border-destructive text-destructive animate-pulse',
        false: 'bg-primary/20 border-primary/40 text-primary',
      },
    },
  }),
  countdownIcon: cva('h-3 w-3', {
    variants: {
      isExpiring: {
        true: 'animate-spin',
        false: '',
      },
    },
  }),
} as const;
