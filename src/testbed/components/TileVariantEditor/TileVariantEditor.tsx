'use client';

import { useState } from 'react';
import { DEFAULT_TILE_VARIANTS, TILE_VARIANT_SLOTS, type TileVariantSlot, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { applyColors } from '@/modules/map/components/TileVariants/TileVariants.validate';
import { TileVariantsProvider } from '@/modules/map/components/TileVariants';
import type { PlayerColor } from '@/lib/types';
import { BaseVariantRow, SlotRow } from './TileVariantEditor.rows';
import { TileVariantSamples } from './TileVariantEditor.samples';

const BUTTON_CLASS = 'rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground disabled:opacity-50';

export function TileVariantEditor() {
  const [selected, setSelected] = useState<TileVariantsConfig['selected']>(DEFAULT_TILE_VARIANTS.selected);
  const [colors, setColors] = useState<Record<string, PlayerColor | null>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effective: TileVariantsConfig = {
    variants: applyColors(DEFAULT_TILE_VARIANTS.variants, colors),
    selected,
  };
  const baseVariants = effective.variants.filter((variant) => variant.type === 'base');

  const handleSlotChange = (slot: TileVariantSlot, id: string | undefined) => {
    setStatus(null);
    setSelected((prev) => ({ ...prev, [slot]: id }));
  };

  const handleColorChange = (id: string, color: PlayerColor | null) => {
    setStatus(null);
    setColors((prev) => ({ ...prev, [id]: color }));
  };

  const handleSave = async () => {
    setSaving(true);
    const response = await fetch('/api/tile-variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit: { selected, colors } }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setStatus(response.ok ? 'Saved. Reload the game to use it everywhere.' : (body.error ?? `Save failed (${response.status}).`));
    setSaving(false);
  };

  return (
    <TileVariantsProvider value={effective}>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Slots</h3>
          {TILE_VARIANT_SLOTS.map((slot) => (
            <SlotRow
              key={slot}
              slot={slot}
              variants={effective.variants}
              selectedId={selected[slot]}
              onChange={handleSlotChange}
            />
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Base castle colours</h3>
          {baseVariants.length === 0 && (
            <p className="text-xs text-muted-foreground">No base variants yet. Add images to public/sprites/tile-variants/base/.</p>
          )}
          {baseVariants.map((variant) => (
            <BaseVariantRow key={variant.id} variant={variant} color={variant.color} onColorChange={handleColorChange} />
          ))}
        </section>

        <div className="flex items-center gap-3">
          <button type="button" onClick={handleSave} disabled={saving} className={BUTTON_CLASS}>
            Save
          </button>
          {status && <span className="text-sm text-muted-foreground">{status}</span>}
        </div>

        <TileVariantSamples />
      </div>
    </TileVariantsProvider>
  );
}
