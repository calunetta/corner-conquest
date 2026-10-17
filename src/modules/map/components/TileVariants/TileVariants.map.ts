import type { CSSProperties } from 'react';
import { IslandType, type Island, type PlayerColor } from '@/lib/types';
import type { DecorationLayoutsConfig } from '../../decoration-layouts.types';
import {
  pickVariant,
  poolFor,
  type TileTransform,
  type TileVariant,
  type TileVariantType,
  type TileVariantsConfig,
} from './TileVariants.config';

/** Places an image by its centre and size, in percent of the tile. */
export function toPlacementStyle({ x, y, size }: TileTransform): CSSProperties {
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}%`,
    height: `${size}%`,
    transform: 'translate(-50%, -50%)',
  };
}

/**
 * Moves the game's built-in art by a variant's position. The built-in spot is the default: x and y of 50
 * mean no move. Apply it to a wrapper the size of the tile.
 */
export function toBuiltInOffsetStyle({ x, y }: TileTransform): CSSProperties {
  return { transform: `translate(${x - 50}%, ${y - 50}%)` };
}

/** Scales the built-in art by a variant's size. 100 is the built-in size. */
export function toBuiltInScale({ size }: TileTransform): number {
  return size / 100;
}

/** Shifts a slot's left/top by a resource variant's offset. Slots that anchor to the right or bottom keep their own anchor. */
export function toOffsetSlotStyle<T extends object>(slotStyle: T, { x, y }: TileTransform): T {
  const { top, left } = slotStyle as { top?: string; left?: string };
  const dx = x - 50;
  const dy = y - 50;
  return {
    ...slotStyle,
    ...(left && dx !== 0 ? { left: `calc(${left} + ${dx}%)` } : {}),
    ...(top && dy !== 0 ? { top: `calc(${top} + ${dy}%)` } : {}),
  };
}

/** The variant type whose decorations a tile draws. Resource tiles follow their first resource's type. */
export function decorationVariantType(island: Island): TileVariantType | null {
  switch (island.type) {
    case IslandType.Base:
      return 'base';
    case IslandType.Special:
      return 'special';
    case IslandType.Monster:
      return 'monster';
    case IslandType.Empty:
      return 'empty';
    case IslandType.Resource:
      return island.resources[0] ? `resource-${island.resources[0].type}` : null;
    default:
      return null;
  }
}

/** The variant a tile draws, with the same pool and seed as its art, so one variant gives both art and decorations. */
export function toTileVariant(
  island: Island,
  config: TileVariantsConfig,
  seed: number,
  ownerColor: PlayerColor | undefined,
): TileVariant | null {
  const type = decorationVariantType(island);
  if (!type) return null;
  return pickVariant(poolFor(config, type, ownerColor), seed);
}

/**
 * The variant each kind of art draws on one tile. The board's assignment wins when it has a variant of this tile's
 * type; otherwise the seed picks from the pool, so previews and editors without a board still draw something.
 */
export function toTilePicks(
  config: TileVariantsConfig,
  assigned: TileVariant | null,
  seed: number,
  ownerColor: PlayerColor | undefined,
): Record<'special' | 'monster' | 'base' | 'empty', TileVariant | null> {
  const pickFor = (type: TileVariantType, color?: PlayerColor) =>
    assigned?.type === type ? assigned : pickVariant(poolFor(config, type, color), seed);
  return {
    special: pickFor('special'),
    monster: pickFor('monster'),
    base: pickFor('base', ownerColor),
    empty: pickFor('empty'),
  };
}

/** The decoration layouts for a tile's variant: its own layouts where it has them, the default layouts otherwise. */
export function toDecorationLayoutsConfig(
  defaults: DecorationLayoutsConfig,
  variant: TileVariant | null,
): DecorationLayoutsConfig {
  if (!variant?.decorations) return defaults;
  return { ...defaults, ...variant.decorations } as DecorationLayoutsConfig;
}
