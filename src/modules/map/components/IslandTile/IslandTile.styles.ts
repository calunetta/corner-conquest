import { cva } from 'class-variance-authority';
import type { CSSProperties } from 'react';
import type { PlayerColor } from '@/lib/types';
import type { FogTiming } from '../TileFog';
import {
  BASE_CREST_MIN_PX,
  BASE_CREST_SIZE,
  BORDER_DECORATION_BOTTOM_OFFSET_PX,
  BORDER_DECORATION_HEIGHT_PX,
  BORDER_DECORATION_WIDTH_PX,
  SPECIAL_ISLAND_LEFT,
  SPECIAL_ISLAND_SIZE,
  SPECIAL_ISLAND_TOP,
} from '../../island-tile-slots.types';

export const styles = {
  // Tile art never takes the pointer: clicks reach the tile, and no picture can be dragged out as a ghost.
  tile: cva(
    'relative flex aspect-square w-full items-center justify-center rounded-lg border-2 shadow-[0_10px_20px_rgba(0,0,0,0.6)] transition-all duration-300 [&_img]:pointer-events-none [&_img]:select-none [&_img]:[-webkit-user-drag:none]',
    {
      variants: {
        isClickable: {
          true: 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]',
          false: '!cursor-default',
        },
        isSelected: {
          true: 'border-primary shadow-[0_0_30px_rgba(var(--primary),0.8)]',
          false: 'border-transparent',
        },
        isPossibleMove: {
          true: 'border-accent/80 shadow-[0_0_20px_rgba(var(--accent),0.6)]',
          false: '',
        },
        isTeleportTarget: {
          true: 'border-purple-500/50 shadow-lg shadow-purple-500/40',
          false: '',
        },
        isScoutTarget: {
          true: 'border-blue-500/50 shadow-lg shadow-blue-500/40',
          false: '',
        },
      },
      compoundVariants: [
        {
          isClickable: true,
          isSelected: false,
          isPossibleMove: false,
          className: 'hover:border-foreground/50',
        },
      ],
      defaultVariants: {
        isClickable: false,
        isSelected: false,
        isPossibleMove: false,
        isTeleportTarget: false,
        isScoutTarget: false,
      },
    },
  ),
  terrain: 'absolute inset-0 z-10 rounded-lg bg-terrain bg-cover bg-center bg-no-repeat',
  // Holds the tile's decorations and center content. Hidden (not unmounted) while fogged so the
  // reveal can fade the content in beneath the fog layer (TileFog).
  revealLayer: 'absolute inset-0 z-20 flex items-center justify-center transition-opacity ease-out',
  revealLayerCovered: 'opacity-0',
  centerContent: 'z-20 h-full w-full p-1',
  // Absolute so its box is the tile's padding box, not the p-1 centerContent inset: TileResources'
  // percent slot sizes resolve against this box, and the inset shrank them to ~6px at T=46.
  baseContent: 'absolute inset-0 flex items-center justify-center',
  // Size is set inline as percent-of-tile (see toBaseCrestStyle below), not by fixed px classes tied to the window breakpoint.
  baseImageWrapper: 'relative drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]',
  baseImage: 'object-contain',
  baseFallbackIcon: 'h-full w-full p-2 text-muted-foreground',
  // Position and size are set inline (see toSpecialIslandStyle below), same top/left-is-center
  // convention as the resource-node slots, resolved against the tile's full padding box.
  specialContent: 'absolute',
  specialImage: 'object-contain',
  monsterStack: 'flex h-full w-full flex-col',
  monsterSlot: 'relative h-1/2 w-full',
  // A lone monster gets the whole tile so it sits centered on the tile it lives on.
  monsterSlotSingle: 'relative h-full w-full',
  // Bottom offset and each image's box are set inline from island-tile-slots.types.ts (see toBorderRowStyle/toBorderImageStyle below).
  borderRow: 'pointer-events-none absolute left-1/2 z-0 flex w-full -translate-x-1/2 justify-center',
  borderImageWrapper: 'relative',
  borderImage: 'object-contain',
} as const;

/** Mirrors legacy IslandTile.tsx:29-34; applied with `shadow-lg` as a sibling class, not merged in. */
export const playerTileIndicatorShadow: Record<PlayerColor, string> = {
  blue: 'shadow-blue-500/50',
  red: 'shadow-red-500/50',
  purple: 'shadow-purple-500/50',
  yellow: 'shadow-yellow-400/50',
};

/** `scale` is the variant's size relative to the built-in size (1 = built-in). */
export function toBaseCrestStyle(scale = 1): CSSProperties {
  const side = `max(${BASE_CREST_MIN_PX}px, ${BASE_CREST_SIZE}%)`;
  return { width: side, height: side, transform: `scale(${scale})` };
}

export function toRevealLayerStyle(timing: FogTiming, prefersReducedMotion: boolean): CSSProperties {
  if (prefersReducedMotion) return { transitionDuration: '0ms', transitionDelay: '0ms' };
  return {
    transitionDuration: `${timing.revealFadeMs}ms`,
    transitionDelay: `${timing.revealDelayMs}ms`,
  };
}

/** `scale` is the variant's size relative to the built-in size (1 = built-in). */
export function toSpecialIslandStyle(scale = 1): CSSProperties {
  return {
    top: SPECIAL_ISLAND_TOP,
    left: SPECIAL_ISLAND_LEFT,
    width: `${SPECIAL_ISLAND_SIZE}%`,
    height: `${SPECIAL_ISLAND_SIZE}%`,
    transform: `translate(-50%, -50%) scale(${scale})`,
  };
}

export function toBorderRowStyle(): CSSProperties {
  return { bottom: `${BORDER_DECORATION_BOTTOM_OFFSET_PX}px` };
}

export function toBorderImageStyle(): CSSProperties {
  return { width: BORDER_DECORATION_WIDTH_PX, height: BORDER_DECORATION_HEIGHT_PX };
}
