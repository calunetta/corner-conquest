import { cva } from 'class-variance-authority';

export const styles = {
  root: 'flex flex-wrap items-center justify-between gap-2',
  leftGroup: 'flex flex-wrap items-center gap-2 sm:gap-4',
  title: 'text-xl font-bold sm:text-2xl truncate max-w-[200px] sm:max-w-md',
  vpGoalBadge: 'flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold border border-white/5',
  vpGoalIcon: 'h-4 w-4 text-yellow-400',
  resourceStrip: 'flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold border border-white/5',
  resourcePair: 'flex items-center gap-1',
  resourceIcon: 'h-3.5 w-3.5 shrink-0',
  resourceValue: 'font-mono font-extrabold text-xs text-foreground',
  rightGroup: 'flex items-center gap-2',
  turnIndicatorWrapper: 'flex items-center gap-1.5 rounded-md bg-black/40 border border-white/10 px-2.5 py-1 text-xs font-semibold',
  turnLabel: 'text-muted-foreground hidden sm:inline',
  playerName: 'font-bold text-foreground',
  startGameButton: 'font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black',
  exitButtonArrow: 'h-4 w-4',
  exitButtonLoader: 'animate-spin',
  startGameIcon: 'mr-2 h-4 w-4',
  turnTimerIcon: cva('h-3.5 w-3.5', {
    variants: {
      isExpiring: {
        true: 'text-destructive animate-pulse',
        false: 'text-primary',
      },
    },
  }),
  countdown: cva('font-mono font-bold', {
    variants: {
      isExpiring: {
        true: 'text-destructive',
        false: 'text-primary',
      },
    },
  }),
} as const;
