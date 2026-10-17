import type { FogTiming } from './TileFog.config';

/** Inline style for the fog layer: placement and scale. Timing is applied in TileFog.styles.ts. */
export function toFogTransform({ offsetXPct, offsetYPct, scale }: Pick<FogTiming, 'offsetXPct' | 'offsetYPct' | 'scale'>): string {
  return `translate(${offsetXPct}%, ${offsetYPct}%) scale(${scale})`;
}
