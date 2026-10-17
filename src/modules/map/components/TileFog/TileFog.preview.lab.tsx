'use client';

import { useState } from 'react';
import { createViewModelWithState, WithGameBoardContext } from '../IslandTile/IslandTile.preview.shared';
import { resourceIslandWithThreeNodesAndThreeOccupants } from '../IslandTile/IslandTile.fixtures';
import { FogSettingsProvider } from './TileFog.context';
import { applyFrameDelay } from './TileFog.preview.api';
import { useSavedFogTiming } from './TileFog.preview.saved';
import { FogVariantUploadForm } from './TileFog.preview.upload';
import { StatusText, type Status } from './TileFog.preview.status';
import { useRepeatingReveal } from './TileFog.preview.repeat';
import { BUTTON_CLASS, CONTROL_LABELS } from './TileFog.preview.controls';
import {
  DEFAULT_FOG_VARIANTS,
  FOG_TIMING_RANGES,
  FRAME_DELAY_RANGE,
  type FogTiming,
  type FogVariant,
} from './TileFog.config';

const TILE_WIDTH_PX = 180;

/**
 * Tunes the fog on a real tile. The button toggles discovery; the sliders and the selected variant
 * apply to the tile right away. "Upload variant" adds a still + animation pair to the config.
 * "Save timing as defaults" writes fog-timing.config.json.
 */
export function TileFogRevealLab() {
  const [isCovered, setIsCovered] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [variants, setVariants] = useState<FogVariant[]>(DEFAULT_FOG_VARIANTS);
  const [selectedId, setSelectedId] = useState(DEFAULT_FOG_VARIANTS[0].id);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { timing, setTiming, save: handleSaveTiming } = useSavedFogTiming(setStatus);
  const selectedVariant = variants.find((variant) => variant.id === selectedId) ?? variants[0];
  const [speedDraft, setSpeedDraft] = useState(selectedVariant.frameDelayMs);
  useRepeatingReveal(repeat, isCovered, selectedVariant.passMs, setIsCovered);

  const viewModel = createViewModelWithState(resourceIslandWithThreeNodesAndThreeOccupants, {
    isTileVisible: !isCovered,
  });

  const updateField = (key: keyof FogTiming, value: number) => {
    setStatus({ kind: 'idle' });
    setTiming((prev) => ({ ...prev, [key]: value }));
  };

  const selectVariant = (id: string) => {
    const variant = variants.find((candidate) => candidate.id === id);
    setSelectedId(id);
    setSpeedDraft(variant?.frameDelayMs ?? speedDraft);
  };

  const handleApplySpeed = async () => {
    setStatus({ kind: 'busy' });
    const result = await applyFrameDelay(selectedVariant.id, speedDraft);
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.message });
      return;
    }
    const variant = result.value;
    setVariants((prev) => prev.map((candidate) => (candidate.id === variant.id ? variant : candidate)));
    setStatus({ kind: 'ok', message: `Re-encoded at ${variant.frameDelayMs} ms per frame.` });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setIsCovered((covered) => !covered)} className={BUTTON_CLASS}>
          {isCovered ? 'Reveal tile' : 'Cover tile again'}
        </button>
        <span className="text-sm text-muted-foreground">{isCovered ? 'Covered' : 'Revealed'}</span>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} />
          Repeat animation
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          Variant
          <select
            value={selectedVariant.id}
            onChange={(event) => selectVariant(event.target.value)}
            className="rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleSaveTiming} disabled={status.kind === 'busy'} className={BUTTON_CLASS}>
          Save timing as defaults
        </button>
        <StatusText status={status} />
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm text-foreground">
        <label className="flex flex-col gap-1">
          Frame delay (ms): <code className="text-muted-foreground">{speedDraft}</code>
          <input
            type="range"
            {...FRAME_DELAY_RANGE}
            value={speedDraft}
            onChange={(event) => setSpeedDraft(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={handleApplySpeed}
          disabled={status.kind === 'busy' || speedDraft === selectedVariant.frameDelayMs}
          className={BUTTON_CLASS}
        >
          Apply speed
        </button>
        <span className="text-muted-foreground">
          Pass: {selectedVariant.passMs} ms ({selectedVariant.frameDelayMs} ms per frame)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {(Object.keys(CONTROL_LABELS) as (keyof FogTiming)[]).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-foreground">
            <span>
              {CONTROL_LABELS[key]}: <code className="text-muted-foreground">{timing[key]}</code>
            </span>
            <input
              type="range"
              {...FOG_TIMING_RANGES[key]}
              value={timing[key]}
              onChange={(event) => updateField(key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <FogVariantUploadForm
        disabled={status.kind === 'busy'}
        onUploaded={(variant) => {
          setVariants((prev) => [...prev, variant]);
          selectVariant(variant.id);
          setStatus({ kind: 'ok', message: `Uploaded "${variant.name}".` });
        }}
        onError={(message) => setStatus({ kind: 'error', message })}
      />

      <p className="text-xs text-muted-foreground">
        The fade always ends inside one {selectedVariant.passMs} ms pass of the gif, so the loop never shows again.
      </p>
      <div style={{ width: TILE_WIDTH_PX }}>
        <FogSettingsProvider value={{ timing, variants: [selectedVariant] }}>
          <WithGameBoardContext viewModel={viewModel} />
        </FogSettingsProvider>
      </div>
    </div>
  );
}
