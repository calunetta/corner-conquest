export const styles = {
  container: 'pointer-events-none absolute inset-0 z-25 select-none',
  boatEntry: 'absolute',
  boat: 'relative w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-110',
  boatImage: 'h-full w-full object-contain',
  collectorOverlay: 'absolute z-26 w-5 h-5 sm:w-6 sm:h-6 -top-2.5 -left-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
  collectorImage: 'h-full w-full object-contain',
} as const;
