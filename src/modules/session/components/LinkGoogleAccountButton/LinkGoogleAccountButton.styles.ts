// Mobile target is 44x44 px (WCAG 2.5.5). `size="icon"` gives h-10 w-10, and cn() lets the later h-11 w-11 win.
export const styles = {
  desktopButton:
    'hidden sm:inline-flex gap-1.5 border-white/10 bg-black/40 text-xs text-foreground hover:bg-white/10',
  mobileButton: 'sm:hidden h-11 w-11 border-white/10 bg-black/40 text-foreground hover:bg-white/10',
  icon: 'h-4 w-4',
  spinnerIcon: 'h-4 w-4 animate-spin',
  mobileIcon: 'h-5 w-5',
  mobileSpinnerIcon: 'h-5 w-5 animate-spin',
} as const;
