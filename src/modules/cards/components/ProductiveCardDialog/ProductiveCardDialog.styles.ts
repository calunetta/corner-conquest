import { cva } from 'class-variance-authority';

export const styles = {
  content:
    'bg-background/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden',
  header: 'pb-2 border-b border-white/10',
  headerRow: 'flex items-center gap-2',
  iconWrap:
    'h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400',
  icon: 'h-5 w-5',
  title: 'text-xl font-bold',
  description: 'text-xs text-muted-foreground',
  grid: 'grid grid-cols-3 gap-3 py-4',
  option: cva(
    'relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200',
    {
      variants: {
        isSelected: {
          true: 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.4)] scale-105',
          false: 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60',
        },
      },
    },
  ),
  selectedBadge:
    'absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-500 text-black flex items-center justify-center',
  selectedIcon: 'h-3 w-3 stroke-[3]',
  spriteWrap: 'relative w-11 h-11 mb-1 flex items-center justify-center drop-shadow',
  sprite: 'h-full w-full object-contain',
  nameRow: 'flex items-center gap-1',
  resourceIcon: 'w-3.5 h-3.5',
  resourceName: 'text-xs font-bold text-foreground capitalize',
  amount: 'text-xs font-black font-mono text-emerald-400 mt-0.5',
  footer: 'pt-2 border-t border-white/10',
  confirmButton:
    'w-full font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_16px_rgba(16,185,129,0.3)]',
} as const;
