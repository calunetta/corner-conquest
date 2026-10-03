import type { PlayerColor } from '@/lib/types';

export const playerBorderColors: Record<PlayerColor, string> = {
  blue: 'border-l-blue-500',
  red: 'border-l-red-500',
  purple: 'border-l-purple-500',
  yellow: 'border-l-yellow-400',
};

export const playerBgGlow: Record<PlayerColor, string> = {
  blue: 'bg-blue-500/10',
  red: 'bg-red-500/10',
  purple: 'bg-purple-500/10',
  yellow: 'bg-yellow-400/10',
};

export const playerRingColors: Record<PlayerColor, string> = {
  blue: 'ring-blue-500/40',
  red: 'ring-red-500/40',
  purple: 'ring-purple-500/40',
  yellow: 'ring-yellow-400/40',
};

export const styles = {
  card: 'transition-all duration-300 bg-background/50 backdrop-blur-xl border-white/10 shadow-lg border-l-4 relative overflow-hidden',
  cardCurrent: 'ring-2 ring-accent shadow-[0_0_24px_rgba(var(--accent),0.4)] scale-[1.01] bg-accent/5',
  cardOther: 'hover:scale-[1.005]',
  content: 'p-2.5 sm:p-3 flex flex-col gap-2',
  headerRow: 'flex items-center justify-between gap-2',
  avatarSection: 'flex items-center gap-2 min-w-0 flex-1',
  avatarContainer: 'relative h-9 w-9 shrink-0 rounded-xl bg-black/50 p-0.5 border border-white/15 overflow-hidden flex items-center justify-center ring-1',
  avatarImage: 'object-contain',
  nameContainer: 'min-w-0 flex-1',
  nameTrigger: 'flex items-center gap-1.5 cursor-default',
  nameText: 'text-xs sm:text-sm font-extrabold truncate text-foreground tracking-tight',
  botBadge: 'text-[9px] px-1 py-0 h-4 bg-white/10 text-muted-foreground font-semibold',
  turnBadgeSection: 'flex items-center gap-1 shrink-0',
  turnBadge: 'text-[10px] sm:text-[11px] px-2 py-0.5 font-extrabold flex items-center gap-1 shadow-sm',
  turnBadgeExpiring: 'bg-destructive text-destructive-foreground animate-pulse',
  turnBadgeNormal: 'bg-accent text-accent-foreground font-black',
  turnBadgeTime: 'font-mono',
  vpSection: 'flex flex-col gap-1',
  vpLabel: 'flex items-center justify-between text-[11px] font-semibold',
  vpLabelText: 'flex items-center gap-1 text-yellow-400 font-bold',
  vpLabelValue: 'font-mono text-yellow-400 font-extrabold',
  vpBar: 'w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/10 relative',
  vpFill: 'h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]',
  statsGrid: 'grid grid-cols-3 gap-1.5 pt-0.5',
  statChip: 'flex items-center justify-center gap-1 rounded-md bg-black/40 px-1.5 py-1 border border-white/10 text-[11px] font-semibold cursor-default',
  statIcon: 'shrink-0',
  statValue: 'font-mono text-foreground font-bold',
  positionedIndicator: 'text-[10px] text-amber-400 flex items-center',
  resourcesGrid: 'grid grid-cols-3 gap-1.5',
  resourceChip: 'flex items-center justify-between rounded-md bg-black/50 px-2 py-1 border border-white/10 shadow-sm cursor-default hover:bg-black/70 transition-colors',
  resourceValue: 'font-mono font-extrabold text-xs text-foreground',
  buffsSection: 'flex flex-wrap items-center gap-1 pt-1 border-t border-white/5',
  buffBadge: 'text-[9px] px-1.5 py-0 h-4 flex items-center gap-1 bg-white/5 border-white/15 text-foreground hover:bg-white/10',
} as const;
