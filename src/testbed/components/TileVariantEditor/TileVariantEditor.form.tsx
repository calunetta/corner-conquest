'use client';

import { PlayerColor, type PlayerColor as PlayerColorType } from '@/lib/types';
import { TILE_VARIANT_TYPES, type TileImage, type TileTransform, type TileVariant, type TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';
import { TRANSFORM_RANGES, NAME_MAX_LENGTH } from '@/modules/map/components/TileVariants/TileVariants.validate';

const INPUT_CLASS = 'rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground';

const TYPE_LABELS: Record<TileVariantType, string> = {
  base: 'Base castle',
  special: 'Special island',
  monster: 'Monster island (background)',
  empty: 'Empty island',
  'resource-food': 'Food node',
  'resource-wood': 'Wood node',
  'resource-gold': 'Gold node',
};

interface VariantFormProps {
  draft: TileVariant;
  isNew: boolean;
  images: TileImage[];
  onChange: (draft: TileVariant) => void;
  onUploadFile: (file: File) => void;
}

export function VariantForm({ draft, isNew, images, onChange, onUploadFile }: VariantFormProps) {
  const typeImages = images.filter((image) => image.type === draft.type);
  const setTransform = (key: keyof TileTransform, value: number) => onChange({ ...draft, transform: { ...draft.transform, [key]: value } });

  return (
    <div className="flex flex-col gap-4 text-sm text-foreground">
      <label className="flex flex-col gap-1">
        Type
        <select
          value={draft.type}
          disabled={!isNew}
          onChange={(event) => onChange({ ...draft, type: event.target.value as TileVariantType, image: null, color: null })}
          className={INPUT_CLASS}
        >
          {TILE_VARIANT_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Name
        <input
          value={draft.name}
          maxLength={NAME_MAX_LENGTH}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          className={INPUT_CLASS}
        />
      </label>

      {draft.type === 'base' && (
        <label className="flex flex-col gap-1">
          Castle colour
          <select
            value={draft.color ?? ''}
            disabled={!isNew}
            onChange={(event) => onChange({ ...draft, color: (event.target.value || null) as PlayerColorType | null })}
            className={INPUT_CLASS}
          >
            <option value="">Choose a colour</option>
            {Object.values(PlayerColor).map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">Image</legend>
        <div className="flex flex-wrap gap-2">
          <ImageChoice label="Built-in" selected={draft.image === null} onClick={() => onChange({ ...draft, image: null })} />
          {typeImages.map((image) => (
            <ImageChoice
              key={image.id}
              label={image.name}
              imagePath={image.image}
              selected={draft.image === image.image}
              onClick={() => onChange({ ...draft, image: image.image })}
            />
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Upload a new picture for this type (PNG or GIF)
          <input
            type="file"
            accept="image/png,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadFile(file);
              event.target.value = '';
            }}
          />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-3 gap-3">
        <legend className="col-span-3 mb-1">Position and size (% of the tile)</legend>
        <NumberField label="X" value={draft.transform.x} range={TRANSFORM_RANGES.x} onChange={(value) => setTransform('x', value)} />
        <NumberField label="Y" value={draft.transform.y} range={TRANSFORM_RANGES.y} onChange={(value) => setTransform('y', value)} />
        <NumberField label="Size" value={draft.transform.size} range={TRANSFORM_RANGES.size} onChange={(value) => setTransform('size', value)} />
      </fieldset>
    </div>
  );
}

function ImageChoice({ label, imagePath, selected, onClick }: { label: string; imagePath?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-20 flex-col items-center gap-1 rounded-md border p-1 text-xs ${selected ? 'border-primary' : 'border-border'} bg-secondary`}
    >
      {imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element -- small testbed thumbnail of a public sprite
        <img src={imagePath} alt="" className="h-14 w-14 object-contain" />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center text-muted-foreground">none</span>
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

function NumberField({ label, value, range, onChange }: { label: string; value: number; range: { min: number; max: number }; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <input
        type="number"
        min={range.min}
        max={range.max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={INPUT_CLASS}
      />
    </label>
  );
}
