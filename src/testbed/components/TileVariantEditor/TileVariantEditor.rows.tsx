'use client';

import { PlayerColor, type PlayerColor as PlayerColorType } from '@/lib/types';
import { slotAccepts, type TileVariant, type TileVariantSlot } from '@/modules/map/components/TileVariants/TileVariants.config';

const SELECT_CLASS = 'rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground';

export const SLOT_LABELS: Record<string, string> = {
  special: 'Special island',
  monster: 'Monster island (background)',
  'resource-food': 'Food node',
  'resource-wood': 'Wood node',
  'resource-gold': 'Gold node',
};

export function slotLabel(slot: TileVariantSlot): string {
  if (slot.startsWith('base-')) return `Base castle, ${slot.slice('base-'.length)}`;
  return SLOT_LABELS[slot] ?? slot;
}

interface SlotRowProps {
  slot: TileVariantSlot;
  variants: TileVariant[];
  selectedId: string | undefined;
  onChange: (slot: TileVariantSlot, id: string | undefined) => void;
}

/** One slot: a dropdown of the variants that fit it, with "Built-in" meaning no variant. */
export function SlotRow({ slot, variants, selectedId, onChange }: SlotRowProps) {
  const options = variants.filter((variant) => slotAccepts(slot, variant));
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-foreground">
      <span>{slotLabel(slot)}</span>
      <select
        value={selectedId ?? ''}
        onChange={(event) => onChange(slot, event.target.value || undefined)}
        className={SELECT_CLASS}
      >
        <option value="">Built-in</option>
        {options.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.name}
          </option>
        ))}
      </select>
    </label>
  );
}

interface BaseVariantRowProps {
  variant: TileVariant;
  color: PlayerColorType | null;
  onColorChange: (id: string, color: PlayerColorType | null) => void;
}

/** One base castle image: its colour decides which player slot it can fill. */
export function BaseVariantRow({ variant, color, onColorChange }: BaseVariantRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-foreground">
      <span>{variant.name}</span>
      <select
        value={color ?? ''}
        onChange={(event) => onColorChange(variant.id, (event.target.value || null) as PlayerColorType | null)}
        className={SELECT_CLASS}
      >
        <option value="">No colour</option>
        {Object.values(PlayerColor).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
