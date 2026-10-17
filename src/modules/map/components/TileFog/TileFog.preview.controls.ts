import type { FogTiming } from './TileFog.config';

export const CONTROL_LABELS: Record<keyof FogTiming, string> = {
  fadeStartMs: 'Fade starts (ms into the pass)',
  fadeMs: 'Fade length (ms)',
  scale: 'Fog scale',
  offsetXPct: 'Fog offset X (%)',
  offsetYPct: 'Fog offset Y (%)',
  revealDelayMs: 'Content delay (ms)',
  revealFadeMs: 'Content fade (ms)',
};


export const BUTTON_CLASS =
  'rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground disabled:opacity-50';
