export const styles = {
  content: 'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden',
  header: 'pb-2 border-b border-white/10',
  headerRow: 'flex items-center gap-2',
  iconWrap: 'h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400',
  icon: 'h-5 w-5',
  title: 'text-xl font-bold',
  description: 'text-xs text-muted-foreground',
  grid: 'grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-4',
  targetButton:
    'flex flex-col items-center p-3 rounded-xl border border-white/10 bg-black/40 hover:border-red-500/40 hover:bg-red-500/10 hover:scale-105 transition-all duration-200',
  spriteWrap: 'relative h-10 w-10 mb-1 flex items-center justify-center',
  sprite: 'object-contain drop-shadow',
  name: 'text-xs font-bold truncate max-w-full text-foreground',
  skipLabel: 'text-[10px] text-red-400 font-semibold mt-0.5 flex items-center gap-0.5',
  skipIcon: 'h-2.5 w-2.5',
  footer: 'pt-2 border-t border-white/10',
  closeButton: 'border-white/10 text-xs',
} as const;
