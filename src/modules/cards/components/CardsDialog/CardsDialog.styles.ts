export const styles = {
  content:
    'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md sm:max-w-2xl overflow-hidden',
  header: 'pb-2 border-b border-white/10',
  headerRow: 'flex items-center gap-2',
  iconWrap:
    'h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400',
  icon: 'h-5 w-5',
  title: 'text-xl font-bold',
  description: 'text-xs text-muted-foreground',
  scrollArea: 'h-80 pr-3 my-2',
  grid: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  card: 'bg-black/40 border-white/10 hover:border-cyan-500/30 hover:bg-black/60 transition-all duration-200',
  tile: 'flex gap-3 p-3',
  tileBody: 'flex min-w-0 flex-1 flex-col gap-1.5',
  nameRow: 'flex items-center justify-between gap-2',
  cardTitle: 'text-sm font-bold text-foreground truncate',
  countBadge: 'text-xs font-mono font-bold bg-white/5 border-white/15',
  useButton:
    'h-9 text-xs px-3 font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]',
  useRow: 'mt-auto pt-1',
  playIcon: 'mr-1 h-3 w-3',
  descriptionText: 'text-xs text-muted-foreground leading-relaxed',
  emptyState: 'col-span-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2',
  emptyIcon: 'h-8 w-8 text-muted-foreground/50',
  emptyText: 'text-sm',
  footer: 'pt-2 border-t border-white/10',
  closeButton: 'border-white/10 text-xs',
} as const;
