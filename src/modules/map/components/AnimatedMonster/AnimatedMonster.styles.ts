export const styles = {
  wrapper: 'relative h-full w-full flex items-center justify-center overflow-visible will-change-transform',
  // Preflight caps every img at its box (max-width: 100%); a boss sprite must be able to exceed it.
  image: 'max-w-none drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-in-out select-none',
} as const;
