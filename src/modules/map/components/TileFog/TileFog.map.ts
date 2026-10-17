import type { CSSProperties } from 'react';
import type { FogTiming } from './TileFog.config';

/** Neutral fog colour (Tailwind zinc-600). Plain grey, so it reveals nothing about the terrain beneath. */
export const NEUTRAL_FOG_COLOUR = '#52525b';

/** Inline style for the fog layer: placement and scale. Timing is applied in TileFog.styles.ts. */
export function toFogTransform({ offsetXPct, offsetYPct, scale }: Pick<FogTiming, 'offsetXPct' | 'offsetYPct' | 'scale'>): string {
  return `translate(${offsetXPct}%, ${offsetYPct}%) scale(${scale})`;
}

/**
 * Opaque backing under the fog art when the neutral-fog setting is on. The art alone is see-through,
 * so without this the terrain colour still shows. Off returns no style, so the fog stays as it was.
 */
export function toNeutralFogStyle(isNeutral: boolean): CSSProperties | undefined {
  return isNeutral ? { backgroundColor: NEUTRAL_FOG_COLOUR } : undefined;
}
