export const styles = {
  content:
    'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md sm:max-w-lg overflow-hidden',
  header: 'pb-2 border-b border-white/10',
  headerRow: 'flex items-center gap-2',
  iconWrap:
    'h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400',
  icon: 'h-5 w-5',
  title: 'text-xl font-bold',
  description: 'text-xs text-muted-foreground',
  scrollArea: 'h-72 pr-3 my-2',
  grid: 'grid gap-3',
  card: 'bg-black/40 border-white/10 hover:border-emerald-500/30 hover:bg-black/60 transition-all duration-200',
  cardHeader: 'flex-row items-center justify-between p-3 pb-1',
  cardTitle: 'text-sm font-bold text-foreground',
  activeBadge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1',
  activeIcon: 'h-3.5 w-3.5',
  buyButton:
    'h-7 text-xs px-3 font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  buyIcon: 'mr-1 h-3.5 w-3.5',
  cardContent: 'p-3 pt-1',
  descriptionText: 'text-xs text-muted-foreground leading-relaxed',
  footer: 'pt-2 border-t border-white/10',
  closeButton: 'border-white/10 text-xs',
} as const;
