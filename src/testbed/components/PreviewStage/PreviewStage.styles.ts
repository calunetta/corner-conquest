import { cn } from '@/lib/utils';

export const styles = {
  page: 'mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-10',
  header: 'flex flex-col gap-1',
  backLink:
    'w-fit text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden',
  title: 'text-2xl font-black tracking-wide text-foreground',
  group: 'text-xs uppercase tracking-widest text-muted-foreground',
  stateList: 'flex flex-wrap gap-2',
  stateListItem: 'flex',
  stateLink: (isActive: boolean) =>
    cn(
      'inline-flex min-h-11 items-center rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:min-h-9',
      isActive
        ? 'border-primary bg-primary/20 font-semibold text-primary'
        : 'border-border bg-transparent text-muted-foreground hover:bg-primary/10 hover:text-foreground',
    ),
  state: 'flex flex-col gap-2',
  stateName: 'text-sm font-semibold text-muted-foreground',
  canvas: 'relative min-h-48 overflow-x-auto rounded-xl border border-dashed border-border bg-background/60 p-6',
  message: 'rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground',
} as const;
