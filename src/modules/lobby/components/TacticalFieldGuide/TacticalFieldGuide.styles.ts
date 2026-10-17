export const styles = {
  guide: 'rounded-2xl bg-black/30 border border-white/10 p-4 sm:p-5 flex flex-col gap-3',
  toggle: 'flex w-full items-center justify-between gap-2 text-left rounded-md focus-visible:ring-2 focus-visible:ring-ring lg:pointer-events-none lg:focus-visible:ring-0',
  header: 'flex items-center gap-2 text-foreground font-bold text-sm',
  headerIcon: 'h-4 w-4 text-cyan-400',
  chevronIcon: 'h-4 w-4 text-muted-foreground lg:hidden',
  content: 'space-y-2.5 text-xs text-muted-foreground',
  contentCollapsed: 'hidden lg:block',
  item: 'flex items-start gap-2',
  itemIcon: 'h-4 w-4 shrink-0 mt-0.5',
} as const;
