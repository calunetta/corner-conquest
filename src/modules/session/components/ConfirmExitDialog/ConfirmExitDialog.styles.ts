export const styles = {
  content: 'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden',
  header: 'pb-2 border-b border-white/10',
  headerRow: 'flex items-center gap-2',
  iconWrap: 'h-9 w-9 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center justify-center text-destructive',
  icon: 'h-5 w-5',
  title: 'text-xl font-bold',
  description: 'text-xs text-muted-foreground',
  footer: 'pt-2 border-t border-white/10 gap-2',
  stayButton: 'border-white/10 text-xs',
  leaveButton: 'text-xs font-bold',
  leaveIcon: 'mr-1.5 h-3.5 w-3.5',
} as const;
