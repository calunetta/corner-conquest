export const styles = {
  page: 'mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 sm:p-10',
  header: 'flex flex-col gap-1',
  backLink:
    'w-fit text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  title: 'text-2xl font-black tracking-wide text-foreground',
  group: 'text-xs uppercase tracking-widest text-muted-foreground',
  state: 'flex flex-col gap-2',
  stateName: 'text-sm font-semibold text-muted-foreground',
  canvas: 'relative min-h-48 rounded-xl border border-dashed border-border bg-background/60 p-6',
  message: 'rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground',
} as const;
