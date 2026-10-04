export const styles = {
  root: 'absolute inset-0 pointer-events-none z-5 overflow-visible will-change-transform',
  rockContainer: 'absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 hover:scale-110 pointer-events-none select-none',
  cloudContainer: 'absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none',
  rockImage: 'drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] object-contain select-none',
  cloudImage: 'drop-shadow-[0_6px_16px_rgba(0,0,0,0.3)] object-contain select-none',
} as const;
