import type { RibbonColor } from './Ribbon.types';

const TEXT_ON_DARK_ART = 'text-foreground [text-shadow:0_1px_0_hsl(var(--ink))]';

export const styles = {
  frame: 'inline-block max-w-full',
  content: 'flex min-w-0 items-center justify-center gap-2',
  text: 'block min-w-0 truncate text-xl font-bold leading-none',
} as const;

export const ribbonTextColor: Record<RibbonColor, string> = {
  blue: TEXT_ON_DARK_ART,
  red: TEXT_ON_DARK_ART,
  yellow: 'text-ink',
};
