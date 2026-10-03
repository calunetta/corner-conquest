export const styles = {
  root: 'absolute bottom-3 left-3 z-30 flex items-center gap-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 p-1 shadow-lg',
  zoomOut: 'h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10',
  zoomOutIcon: 'h-4 w-4',
  zoomReset: 'h-7 px-2 text-xs font-bold text-foreground hover:bg-white/10 min-w-12',
  zoomResetIcon: 'h-3 w-3 mr-1 text-muted-foreground',
  zoomIn: 'h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/10',
  zoomInIcon: 'h-4 w-4',
} as const;
