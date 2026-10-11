export const styles = {
  root: 'rounded-2xl bg-gradient-to-br from-amber-500/10 via-primary/5 to-black/40 border border-amber-500/20 p-4 sm:p-6 flex flex-col gap-4 shadow-lg lg:col-span-12',
  matchName: 'text-lg font-black text-foreground truncate',
  description: 'text-sm text-muted-foreground leading-relaxed',
  reclaimButton: 'w-full self-stretch sm:w-auto sm:self-start font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_24px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-[1.02] py-5 text-sm focus-visible:ring-2 focus-visible:ring-ring',
  icon: 'mr-2 h-4 w-4',
  spinner: 'mr-2 h-4 w-4 animate-spin',
} as const;
