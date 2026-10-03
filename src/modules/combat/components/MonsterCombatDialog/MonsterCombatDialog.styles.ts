import { cva } from 'class-variance-authority';

export const styles = {
  content: 'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden',

  header: 'pb-2 border-b border-white/10',
  headerIcon: 'h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400',
  title: 'text-xl font-bold',
  description: 'text-xs text-muted-foreground',

  combatantsContainer: 'flex items-center justify-between gap-2 py-3',
  vsContainer: 'flex flex-col items-center shrink-0',
  vsIcon: 'h-8 w-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center',
  vsLabel: 'text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-0.5',

  // Attack-screen combatant boxes
  attackerBox: 'flex-1 flex flex-col items-center p-3 rounded-xl border border-white/10 bg-black/40',
  monsterBox: 'flex-1 flex flex-col items-center p-3 rounded-xl border border-destructive/30 bg-destructive/10',

  // Results-screen combatant boxes
  resultsBox: cva('flex-1 flex flex-col items-center p-3 rounded-xl border', {
    variants: {
      isWinner: {
        true: 'border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        false: 'border-white/10 bg-black/40',
      },
    },
    defaultVariants: { isWinner: false },
  }),

  monsterResultsBox: cva('flex-1 flex flex-col items-center p-3 rounded-xl border', {
    variants: {
      isPlayerWinner: {
        true: 'border-white/10 bg-black/40',
        false: 'border-red-500 bg-red-500/15 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
      },
    },
    defaultVariants: { isPlayerWinner: false },
  }),

  combatantName: 'text-xs font-bold truncate max-w-[100px]',
  spriteContainer: 'my-2 h-14 w-14 flex items-center justify-center',
  powerLabel: 'text-xs font-bold text-foreground',
  monsterPowerLabel: 'text-xs font-bold text-destructive',

  // Tactical cards
  tacticalCardsContainer: 'rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2',
  tacticalCardsHeader: 'flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider',

  radioGroup: 'space-y-1.5',
  radioItem: 'flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors',
  radioItemOvercome: 'flex items-center space-x-2 p-1.5 rounded-lg bg-yellow-500/15 border border-yellow-400/30',
  radioItemWarChief: 'flex items-center space-x-2 p-1.5 rounded-lg bg-red-500/15 border border-red-400/30',
  radioItemDecide: 'space-y-2 p-1.5 rounded-lg bg-blue-500/15 border border-blue-400/30',

  decidedValueContainer: 'ml-6 space-y-2 rounded-lg bg-black/50 p-2.5 border border-white/10',
  decidedValueLabel: 'flex items-center gap-1 text-xs',
  decidedValueDisplay: 'font-bold text-blue-400 text-sm font-mono',

  diceCell: cva('flex h-9 w-9 items-center justify-center rounded-lg border-2 text-base font-black shadow-md transition-transform duration-300', {
    variants: {
      isWinner: {
        true: 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105',
        false: 'bg-black/60 border-white/20 text-foreground',
      },
    },
    defaultVariants: { isWinner: false },
  }),

  diceContainer: 'flex flex-wrap justify-center gap-1.5 mt-1',
  diceTotal: 'mt-1 text-sm font-black font-mono',

  outcomeBox: 'text-center py-2 px-3 rounded-xl bg-black/50 border border-white/10',
  outcomeText: 'text-base font-extrabold',
  outcomeWin: 'text-yellow-400 flex items-center justify-center gap-1.5',
  outcomeLoss: 'text-destructive flex items-center justify-center gap-1.5',

  footer: 'pt-2 border-t border-white/10 gap-2',

  attackButton: 'font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.4)] text-xs px-4',
  continueButton: 'w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]',

  spectatorContainer: 'flex flex-col items-center justify-center gap-3 py-6',
  spectatorLoader: 'h-8 w-8 animate-spin text-primary',
  spectatorText: 'text-xs text-muted-foreground',
} as const;
