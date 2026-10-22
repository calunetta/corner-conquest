export const styles = {
  root: 'w-80 max-w-full',
  trackBox: 'relative w-full',
  track: 'h-full w-full overflow-hidden',
  fill: 'block h-full bg-no-repeat [image-rendering:pixelated]',
  label:
    'absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground [text-shadow:0_1px_0_hsl(var(--ink))]',
} as const;
