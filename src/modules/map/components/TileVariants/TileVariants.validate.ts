// Pure checks for a variant saved from the testbed editor. Shared by the save route and its tests.
import { PlayerColor } from '@/lib/types';
import { TILE_VARIANT_TYPES, type TileVariant, type TileVariantType, type TileVariantsConfig, type TileTransform } from './TileVariants.config';

export const TRANSFORM_RANGES = {
  x: { min: 0, max: 100 },
  y: { min: 0, max: 100 },
  size: { min: 5, max: 200 },
} as const;

export const NAME_MAX_LENGTH = 40;

const COLOR_VALUES = new Set<string>(Object.values(PlayerColor));

/** Lowercase letters, digits and dashes only, so an id is safe in a URL and in the config. */
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Stable id for a new variant: `<type>-<slug>`, or `base-<colour>-<slug>` for castles. */
export function toVariantId(type: TileVariantType, color: string | null, name: string): string {
  const slug = toSlug(name);
  return type === 'base' ? `base-${color}-${slug}` : `${type}-${slug}`;
}

function isInRange(value: unknown, range: { min: number; max: number }): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max;
}

export function isTransformInRange(transform: TileTransform): boolean {
  return (
    isInRange(transform.x, TRANSFORM_RANGES.x) &&
    isInRange(transform.y, TRANSFORM_RANGES.y) &&
    isInRange(transform.size, TRANSFORM_RANGES.size)
  );
}

/** The variants that draw this picture. A picture in use cannot be deleted until those variants stop using it. */
export function variantsUsingImage(config: TileVariantsConfig, imagePath: string): TileVariant[] {
  return config.variants.filter((variant) => variant.image === imagePath);
}

/** Returns an error message, or null when the variant can be saved. */
export function validateVariant(config: TileVariantsConfig, variant: TileVariant, isNew: boolean): string | null {
  if (!(TILE_VARIANT_TYPES as readonly string[]).includes(variant.type)) return 'Pick a type.';
  if (!variant.name.trim()) return 'Give the variant a name.';
  if (variant.name.trim().length > NAME_MAX_LENGTH) return `The name can be at most ${NAME_MAX_LENGTH} characters.`;
  if (!isTransformInRange(variant.transform)) return 'Position and size are out of range.';
  if (variant.type === 'base' && !(variant.color && COLOR_VALUES.has(variant.color))) {
    return 'A base castle needs a colour.';
  }
  if (variant.type !== 'base' && variant.color !== null) return 'Only base castles have a colour.';
  if (variant.image !== null && !config.images.some((image) => image.image === variant.image)) {
    return 'That image is not in the tile-variant folders.';
  }
  if (variant.image !== null && !config.images.some((image) => image.image === variant.image && image.type === variant.type)) {
    return 'That image belongs to another type.';
  }
  if (isNew && config.variants.some((existing) => existing.id === variant.id)) {
    return `A variant called "${variant.name}" already exists for this type.`;
  }
  return null;
}
