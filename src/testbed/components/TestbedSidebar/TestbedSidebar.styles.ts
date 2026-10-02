import { cn } from '@/lib/utils';

export const styles = {
  nav: (isIndexRoute: boolean) =>
    cn(
      'w-full flex-col gap-6 overflow-y-auto border-r border-border bg-background p-4 md:w-[280px] md:shrink-0',
      isIndexRoute ? 'flex' : 'hidden md:flex',
    ),
  title: 'text-lg font-black tracking-wide text-foreground',
  empty: 'rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground',
  group: 'flex flex-col gap-3',
  groupTitle: 'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
  list: 'flex flex-col gap-1',
  row: (isActive: boolean) =>
    cn(
      'flex min-h-11 items-center justify-between gap-4 rounded-lg border-l-2 border-transparent px-3 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9',
      isActive && 'border-primary bg-primary/20',
    ),
  rowTitle: (isActive: boolean) => cn('truncate text-foreground', isActive && 'font-semibold text-primary'),
  rowMeta: 'shrink-0 text-xs text-muted-foreground',
} as const;
