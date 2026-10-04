export const styles = {
  root: 'fixed inset-0 z-0 overflow-hidden pointer-events-none select-none',
  gradientBg: 'absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/80 via-background to-black',
  glowCyan: 'absolute -top-32 -left-32 w-[550px] h-[550px] bg-cyan-500/15 rounded-full blur-[140px] animate-pulse',
  glowPurple: 'absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] animate-pulse [animation-delay:3s]',
  glowAmber: 'absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]',
  glowEmerald: 'absolute top-2/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2.5s]',
  waterPattern: 'absolute inset-0 bg-water-pattern opacity-20 mix-blend-overlay',
  islandWrapper: 'absolute rounded-2xl bg-terrain bg-cover bg-center shadow-2xl p-2 flex flex-col items-center justify-center',
  islandImage: 'drop-shadow-lg object-contain',
  decorationWrapper: 'absolute',
  boatWrapper: 'absolute',
  fogOverlay: 'absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50',
} as const;
