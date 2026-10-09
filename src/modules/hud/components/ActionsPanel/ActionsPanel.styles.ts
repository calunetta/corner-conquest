import { cva } from 'class-variance-authority';

export const styles = {
  card: 'bg-background/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
  header: 'flex flex-col gap-2 p-3 sm:p-3.5 pb-2',
  headerTop: 'flex items-center justify-between',
  title: 'text-base font-bold flex items-center gap-2',
  titleText: 'text-base font-bold',
  deckCount: 'text-xs text-muted-foreground font-semibold',
  controls: 'flex flex-wrap items-center justify-between gap-1.5 pt-1',
  cancelButton: 'h-7 text-xs px-2',
  deselectButton: 'h-7 text-xs px-2',
  endTurnButton: 'relative overflow-hidden h-7 text-xs px-2.5 font-bold ml-auto transition-colors',
  endTurnButtonExpiring: 'border border-destructive ring-1 ring-destructive',
  endTurnProgress: 'absolute left-0 top-0 h-full transition-all duration-1000 ease-linear',
  endTurnProgressExpiring: 'bg-destructive/40',
  endTurnProgressNormal: 'bg-primary/50',
  endTurnLabel: 'relative z-10 flex items-center gap-1',
  endTurnTime: 'font-mono text-[10px] opacity-90',
  extraMoveBanner:
    'bg-amber-500/20 border border-amber-500/40 rounded-lg p-2 text-xs font-semibold text-amber-200 flex items-center gap-2 animate-pulse mt-1',
  content: 'p-3 pt-0',
  mainGrid: 'grid grid-cols-3 gap-1.5',
  /** Ring merged onto mainGrid while an army is selected: the actions that apply to it stand out. */
  mainGridActive: 'rounded-lg ring-1 ring-primary/40',
  separator: 'my-2 bg-white/10',
  secondaryGrid: 'grid grid-cols-2 gap-1.5',
  disabledReasonCaption: 'mt-1 block w-full truncate text-[10px] text-destructive/90',
  buttonVariant: cva(
    'flex h-auto min-h-12 w-full flex-col items-center justify-center gap-1 p-2 text-center',
    {
      variants: {
        isMain: {
          true: 'h-16 text-xs',
          false: 'text-xs sm:flex-row sm:text-sm',
        },
        isPendingMatch: {
          true: 'bg-primary text-primary-foreground',
          false: '',
        },
      },
    },
  ),
} as const;
