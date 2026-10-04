export const styles = {
  root: 'relative w-full h-full min-h-[340px] sm:min-h-[460px] flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing touch-none',
  transformWrapper: 'transition-transform duration-75 ease-out flex items-center justify-center p-2 sm:p-6 md:p-10 will-change-transform',
  oceanFrame: 'relative bg-water-pattern bg-repeat p-3 sm:p-5 md:p-8 rounded-3xl border border-white/20 shadow-[0_24px_72px_rgba(0,0,0,0.8)] flex items-center justify-center',
  grid: 'grid z-10 relative',
} as const;
