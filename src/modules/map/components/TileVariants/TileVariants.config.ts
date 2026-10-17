// Pure config for tile art variants. No React or fs here, so the sync script and the game can share it.
import tileVariantsConfig from './tile-variants.config.json';
import { PlayerColor, type ResourceType } from '@/lib/types';

/** Each folder under public/sprites/tile-variants/ is one type; the editor picks one variant per type. */
export const TILE_VARIANT_TYPES = [
  'base',
  'special',
  'monster',
  'resource-food',
  'resource-wood',
  'resource-gold',
] as const;
export type TileVariantType = (typeof TILE_VARIANT_TYPES)[number];

export interface TileVariant {
  id: string;
  type: TileVariantType;
  /** File name without extension, as the artist named it. */
  name: string;
  /** Public path of the image the game draws (the transparent copy for stills). */
  image: string;
  /** Base variants only: the castle colour this image is for. Null until set in the editor. */
  color: PlayerColor | null;
}

/**
 * A place on the map that can take a variant: a type, or one castle colour of the base.
 * `base-red` is the castle for red players; its selected variant must be a base variant with colour red.
 */
export type TileVariantSlot = TileVariantType | `base-${PlayerColor}`;

/** Every slot the editor shows, in display order. */
export const TILE_VARIANT_SLOTS: TileVariantSlot[] = [
  'special',
  'monster',
  'resource-food',
  'resource-wood',
  'resource-gold',
  ...Object.values(PlayerColor).map((color) => `base-${color}` as const),
];

/** Whether a variant can fill a slot: same type, and for a base slot also the same castle colour. */
export function slotAccepts(slot: TileVariantSlot, variant: TileVariant): boolean {
  if (slot.startsWith('base-')) {
    return variant.type === 'base' && variant.color === slot.slice('base-'.length);
  }
  return variant.type === slot;
}

export interface TileVariantsConfig {
  variants: TileVariant[];
  /** Variant id chosen for each slot. A missing slot means the built-in art. */
  selected: Partial<Record<TileVariantSlot, string>>;
}

/** The art the game draws for each slot, or null for the built-in art. */
export interface TileArt {
  special: string | null;
  monster: string | null;
  resources: Partial<Record<ResourceType, string>>;
  base: Partial<Record<PlayerColor, string>>;
}

export function isTileVariantsConfig(value: unknown): value is TileVariantsConfig {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.variants)) return false;
  return record.variants.every((entry) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const variant = entry as Record<string, unknown>;
    return (
      typeof variant.id === 'string' &&
      typeof variant.name === 'string' &&
      typeof variant.image === 'string' &&
      (TILE_VARIANT_TYPES as readonly string[]).includes(variant.type as string)
    );
  });
}

export function variantsOfType(config: TileVariantsConfig, type: TileVariantType): TileVariant[] {
  return config.variants.filter((variant) => variant.type === type);
}

/** Image path selected for a slot, or null when the slot keeps the built-in art. */
export function resolveVariantImage(config: TileVariantsConfig, slot: TileVariantSlot): string | null {
  const id = config.selected[slot];
  if (!id) return null;
  return config.variants.find((variant) => variant.id === id)?.image ?? null;
}

export function resolveTileArt(config: TileVariantsConfig): TileArt {
  return {
    special: resolveVariantImage(config, 'special'),
    monster: resolveVariantImage(config, 'monster'),
    resources: {
      food: resolveVariantImage(config, 'resource-food') ?? undefined,
      wood: resolveVariantImage(config, 'resource-wood') ?? undefined,
      gold: resolveVariantImage(config, 'resource-gold') ?? undefined,
    },
    base: {
      blue: resolveVariantImage(config, 'base-blue') ?? undefined,
      red: resolveVariantImage(config, 'base-red') ?? undefined,
      purple: resolveVariantImage(config, 'base-purple') ?? undefined,
      yellow: resolveVariantImage(config, 'base-yellow') ?? undefined,
    },
  };
}

/** Variants and selections from tile-variants.config.json, which the editor writes. */
export const DEFAULT_TILE_VARIANTS: TileVariantsConfig = {
  variants: tileVariantsConfig.variants as TileVariant[],
  selected: tileVariantsConfig.selected as TileVariantsConfig['selected'],
};
