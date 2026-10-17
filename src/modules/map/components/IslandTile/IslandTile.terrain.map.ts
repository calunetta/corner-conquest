import type { CSSProperties } from 'react';
import { IslandType } from '@/lib/types';
import type { Island } from '@/lib/types';

/** The special island's ground is drawn grey and dark: the shared grass art is filtered, not replaced. */
export const SPECIAL_TERRAIN_FILTER = 'grayscale(0.9) brightness(0.55) contrast(1.1)';

/** A monster island reads as dangerous, not as safe grass: the grass is pushed to a dark, dried-blood red-brown. */
export const MONSTER_TERRAIN_FILTER = 'sepia(0.8) hue-rotate(-45deg) saturate(1.6) brightness(0.62)';

const TERRAIN_FILTERS: Partial<Record<IslandType, string>> = {
  [IslandType.Special]: SPECIAL_TERRAIN_FILTER,
  [IslandType.Monster]: MONSTER_TERRAIN_FILTER,
};

/** Extra style for the tile's ground layer. Special and monster islands change it; the others keep the grass. */
export function toTerrainStyle(island: Island): CSSProperties | undefined {
  const filter = TERRAIN_FILTERS[island.type];
  return filter ? { filter } : undefined;
}

/** Plain grey the ground is drawn in while a covered tile hides its terrain (settings.neutralFog). Tailwind zinc-600. */
export const NEUTRAL_GROUND_COLOUR = '#52525b';
