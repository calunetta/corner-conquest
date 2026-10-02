export const styles = {
  page: 'mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6 sm:p-10',
  header: 'flex flex-col gap-2',
  title: 'text-3xl font-black tracking-wide text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  empty: 'rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground',
  group: 'flex flex-col gap-3',
  groupTitle: 'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
  list: 'grid gap-3 sm:grid-cols-2',
  link: 'flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  linkTitle: 'font-semibold text-foreground',
  linkMeta: 'shrink-0 text-xs text-muted-foreground',
} as const;
