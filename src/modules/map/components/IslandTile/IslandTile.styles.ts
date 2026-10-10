import { cva } from 'class-variance-authority';
import type { PlayerColor } from '@/lib/types';

export const styles = {
  tile: cva(
    'relative flex aspect-square w-full items-center justify-center rounded-lg border-2 shadow-[0_10px_20px_rgba(0,0,0,0.6)] transition-all duration-300',
    {
      variants: {
        isClickable: {
          true: 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]',
          false: 'cursor-default',
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
  centerContent: 'z-20 h-full w-full p-1',
  fogIcon: 'h-full w-full text-muted-foreground/50',
  // Absolute so its box is the tile's padding box, not the p-1 centerContent inset: TileResources'
  // percent slot sizes resolve against this box, and the inset shrank them to ~6px at T=46.
  baseContent: 'absolute inset-0 flex items-center justify-center',
  // Size is set inline as percent-of-tile (see IslandTile.tsx), not by fixed px classes tied to the window breakpoint.
  baseImageWrapper: 'relative drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]',
  baseImage: 'object-contain',
  baseFallbackIcon: 'h-full w-full p-2 text-muted-foreground',
  specialIcon: 'h-full w-full p-2 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]',
  monsterStack: 'flex h-full w-full flex-col',
  monsterSlot: 'relative h-1/2 w-full',
  borderRow: 'pointer-events-none absolute -bottom-[11px] left-1/2 z-0 flex w-full -translate-x-1/2 justify-center',
  borderImageWrapper: 'relative h-5 w-10',
  borderImage: 'object-contain',
} as const;

/** Mirrors legacy IslandTile.tsx:29-34; applied with `shadow-lg` as a sibling class, not merged in. */
export const playerTileIndicatorShadow: Record<PlayerColor, string> = {
  blue: 'shadow-blue-500/50',
  red: 'shadow-red-500/50',
  purple: 'shadow-purple-500/50',
  yellow: 'shadow-yellow-400/50',
};
