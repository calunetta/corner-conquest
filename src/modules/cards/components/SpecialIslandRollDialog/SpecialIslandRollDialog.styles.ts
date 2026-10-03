import { cva } from 'class-variance-authority';

export const styles = {
  content:
    'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden',
  header: 'pb-2 border-b border-white/10',
  headerRow: 'flex items-center gap-2',
  iconWrap:
    'h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 overflow-hidden',
  iconImage: 'object-contain',
  title: 'text-xl font-bold',
  description: 'text-xs text-muted-foreground',
  body: 'flex flex-col items-center justify-center gap-4 py-5',
  diceWrap: 'p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20',
  diceIcon: 'h-16 w-16 text-amber-400 animate-bounce [animation-duration:2s]',
  resultWrap: 'flex flex-col items-center gap-2',
  resultLabel: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider',
  resultDie: cva(
    'flex h-16 w-16 items-center justify-center rounded-xl border-2 text-4xl font-black shadow-lg',
    {
      variants: {
        hasCard: {
          true: 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]',
          false: 'bg-black/60 border-white/20 text-foreground',
        },
      },
    },
  ),
  outcome: 'w-full text-center p-3 rounded-xl bg-black/40 border border-white/10',
  unlockedRow: 'flex items-center justify-center gap-1.5 text-base font-extrabold text-amber-400',
  unlockedIcon: 'h-5 w-5',
  cardAcquired: 'mt-1 text-sm font-bold text-foreground',
  cardName: 'text-amber-300',
  cardDescription: 'mt-1 text-xs text-muted-foreground leading-relaxed',
  noTreasureRow: 'flex items-center justify-center gap-1.5 text-sm font-bold text-destructive',
  noTreasureIcon: 'h-4 w-4',
  noTreasureHint: 'mt-1 text-xs text-muted-foreground',
  footer: 'pt-2 border-t border-white/10',
  rollButton:
    'w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]',
  rollIcon: 'mr-2 h-4 w-4',
  closeButton: 'w-full font-bold bg-white/10 hover:bg-white/20 text-foreground',
} as const;
