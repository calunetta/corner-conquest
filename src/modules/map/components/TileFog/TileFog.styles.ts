import type { CSSProperties } from 'react';
import { clampFogTiming, type FogTiming } from './TileFog.config';
import { toFogTransform } from './TileFog.map';

export const styles = {
  // Above everything on the tile: the content layer, the boats and the occupant markers.
  layer: 'pointer-events-none absolute inset-0 z-[50]',
  layerFadingOut: 'opacity-0 transition-opacity ease-linear',
  layerCleared: 'invisible opacity-0',
  image: 'object-contain',
} as const;

export function toFogLayerStyle(timing: FogTiming, passMs: number, prefersReducedMotion: boolean): CSSProperties {
  return {
    transitionDuration: prefersReducedMotion ? '0ms' : `${clampFogTiming(timing, passMs).fadeMs}ms`,
    transform: toFogTransform(timing),
  };
}
