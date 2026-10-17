// Pure model for tile art variants. No React or fs here, so the sync script, the save route and the game share it.
import { PlayerColor } from '@/lib/types';
import type { DecorationLayout, DecorationScenarioKey } from '../../decoration-layouts.types';
import tileVariantsConfig from './tile-variants.config.json';

/** Each type is one kind of tile art. A tile of that type draws one variant from that type's pool. */
export const TILE_VARIANT_TYPES = ['base', 'special', 'monster', 'empty', 'resource-food', 'resource-wood', 'resource-gold'] as const;
export type TileVariantType = (typeof TILE_VARIANT_TYPES)[number];

/** A picture found in public/sprites/tile-variants/<type>/. Written by the sync script. */
export interface TileImage {
  id: string;
  type: TileVariantType;
  name: string;
  /** Public path the game draws. */
  image: string;
}

/**
 * Where the image sits on the tile, in percent of the tile's size. x and y are the centre; size is
 * the width (and height) of the image. Resource variants read x and y as an offset from each node's slot.
 */
export interface TileTransform {
  x: number;
  y: number;
  size: number;
}

export const CENTRED_TRANSFORM: TileTransform = { x: 50, y: 50, size: 100 };

/** A named look for one type. The `default` variants have no image: they keep the built-in art. */
export interface TileVariant {
  id: string;
  type: TileVariantType;
  name: string;
  /** Public path of the image, or null for the built-in art. */
  image: string | null;
  transform: TileTransform;
  /** Base variants only: the castle colour this variant is for. */
  color: PlayerColor | null;
  /**
   * The decoration layouts this variant draws, per tile state (the same keys as decoration-layouts).
   * Missing keys fall back to the default decorations, so a new variant starts looking like the default.
   */
  decorations?: Partial<Record<DecorationScenarioKey, DecorationLayout[]>>;
}

export interface TileVariantsConfig {
  images: TileImage[];
  variants: TileVariant[];
}

const COLOR_VALUES = new Set<string>(Object.values(PlayerColor));

function isTransform(value: unknown): value is TileTransform {
  if (typeof value !== 'object' || value === null) return false;
  const transform = value as Record<string, unknown>;
  return ['x', 'y', 'size'].every((key) => typeof transform[key] === 'number' && Number.isFinite(transform[key]));
}

export function isTileVariantsConfig(value: unknown): value is TileVariantsConfig {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const typeOk = (type: unknown) => (TILE_VARIANT_TYPES as readonly unknown[]).includes(type);
  const imagesOk =
    Array.isArray(record.images) &&
    record.images.every((image) => {
      const entry = image as Record<string, unknown>;
      return typeof entry.id === 'string' && typeOk(entry.type) && typeof entry.image === 'string';
    });
  const variantsOk =
    Array.isArray(record.variants) &&
    record.variants.every((variant) => {
      const entry = variant as Record<string, unknown>;
      return (
        typeof entry.id === 'string' &&
        typeOk(entry.type) &&
        typeof entry.name === 'string' &&
        (entry.image === null || typeof entry.image === 'string') &&
        isTransform(entry.transform) &&
        (entry.color === null || (typeof entry.color === 'string' && COLOR_VALUES.has(entry.color))) &&
        (entry.decorations === undefined || (typeof entry.decorations === 'object' && entry.decorations !== null))
      );
    });
  return imagesOk && variantsOk;
}

/** The variants a tile of this type can draw. Base tiles only draw castles of their owner's colour. */
export function poolFor(config: TileVariantsConfig, type: TileVariantType, color?: PlayerColor): TileVariant[] {
  return config.variants.filter((variant) => {
    if (variant.type !== type) return false;
    return type !== 'base' || variant.color === color;
  });
}

/** Picks one variant from a pool with a stable hash of the tile's seed: random-looking, but the same on every render. */
export function pickVariant(pool: TileVariant[], seed: number): TileVariant | null {
  if (pool.length === 0) return null;
  const hash = Math.imul(Math.trunc(seed), 2654435761) >>> 0;
  return pool[hash % pool.length];
}

/** The default variants (one per type, one per colour for base), created by the sync when they are missing. */
export const DEFAULT_TILE_VARIANTS_CONFIG: TileVariantsConfig = {
  images: tileVariantsConfig.images as TileImage[],
  variants: tileVariantsConfig.variants as TileVariant[],
};
