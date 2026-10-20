import { cva } from 'class-variance-authority';

export const styles = {
  card: cva('backdrop-blur-xl', {
    variants: {
      variant: {
        panel: 'bg-background/40 bg-black border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        sheet: 'border-none shadow-none bg-transparent flex flex-col h-full',
      },
    },
    defaultVariants: { variant: 'panel' },
  }),
  header: 'p-3 pb-1 flex items-center justify-between gap-2',
  title: 'text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
  toggleRow: 'flex items-center gap-1.5 shrink-0',
  toggleLabel: 'text-[10px] font-medium text-muted-foreground whitespace-nowrap',
  content: cva('p-3 pt-0', {
    variants: {
      variant: {
        panel: '',
        sheet: 'flex-1 min-h-0 flex flex-col',
      },
    },
    defaultVariants: { variant: 'panel' },
  }),
  scrollArea: cva('w-full', {
    variants: {
      variant: {
        panel: 'h-32 sm:h-36',
        sheet: 'flex-1 min-h-0',
      },
    },
    defaultVariants: { variant: 'panel' },
  }),
  entriesContainer: 'space-y-1.5 pr-2',
  entry: 'text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5',
  iconSlot: 'mt-0.5 flex h-4 w-5 shrink-0 items-center justify-center',
  entryIcon: 'h-3 w-3 text-muted-foreground',
  cardIcon: 'h-5 w-5 max-w-none object-contain',
  milestoneIcon: 'h-3 w-3 text-yellow-400',
  entryText: 'flex-1',
  divider: 'flex items-center gap-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70',
  dividerLine: 'h-px flex-1 bg-white/10',
} as const;
