// Pure checks for an edit from the testbed editor, shared by the save route and its tests.
import { PlayerColor } from '@/lib/types';
import { slotAccepts, TILE_VARIANT_SLOTS, type TileVariant, type TileVariantSlot, type TileVariantsConfig } from './TileVariants.config';

export interface TileVariantsEdit {
  selected: Partial<Record<TileVariantSlot, string>>;
  /** Colour for each base variant. Null clears it. */
  colors: Record<string, string | null>;
}

const COLOR_VALUES = new Set<string>(Object.values(PlayerColor));

export function isTileVariantsEdit(value: unknown): value is TileVariantsEdit {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.selected !== 'object' || record.selected === null) return false;
  if (typeof record.colors !== 'object' || record.colors === null) return false;
  const colorsOk = Object.values(record.colors as Record<string, unknown>).every(
    (color) => color === null || (typeof color === 'string' && COLOR_VALUES.has(color)),
  );
  const selectedOk = Object.entries(record.selected as Record<string, unknown>).every(
    ([slot, id]) => (TILE_VARIANT_SLOTS as string[]).includes(slot) && (id === undefined || typeof id === 'string'),
  );
  return colorsOk && selectedOk;
}

/** Applies the colour edits to the variant list, returning a new list. */
export function applyColors(variants: TileVariant[], colors: Record<string, string | null>): TileVariant[] {
  return variants.map((variant) => {
    if (!(variant.id in colors)) return variant;
    return { ...variant, color: (colors[variant.id] as TileVariant['color']) ?? null };
  });
}

/** Returns an error message, or null when the edit can be saved. Checks against the variants after colour edits. */
export function validateTileVariantsEdit(config: TileVariantsConfig, edit: TileVariantsEdit): string | null {
  const variants = applyColors(config.variants, edit.colors);
  for (const [slot, id] of Object.entries(edit.selected)) {
    if (!id) continue;
    const variant = variants.find((candidate) => candidate.id === id);
    if (!variant) return `No variant called "${id}".`;
    if (!slotAccepts(slot as TileVariantSlot, variant)) {
      return `"${id}" cannot fill the ${slot} slot.`;
    }
  }
  return null;
}
