export const styles = {
  container: 'pointer-events-none absolute inset-0 z-[28] select-none',
  nodeSlot: 'absolute flex flex-col items-center justify-center',
  resourceSprite: 'relative w-full h-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)] transition-transform hover:scale-110',
  image: 'h-full w-full object-contain',
  collectorOverlay: 'absolute z-[35] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]',
  collectorImage: 'h-full w-full object-contain',
} as const;
