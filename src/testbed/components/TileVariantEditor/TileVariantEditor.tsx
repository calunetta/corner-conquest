'use client';

import { useState } from 'react';
import { DEFAULT_TILE_VARIANTS_CONFIG, TILE_VARIANT_TYPES, type TileVariant, type TileVariantsConfig, type TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toVariantId } from '@/modules/map/components/TileVariants/TileVariants.validate';
import { deleteVariant, saveVariant, uploadImage } from './TileVariantEditor.api';
import { newDraft, toListLabel } from './TileVariantEditor.draft';
import { VariantForm } from './TileVariantEditor.form';
import { PlacementPreview } from './TileVariantEditor.placement';

const BUTTON_CLASS = 'rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground disabled:opacity-50';

interface EditorState {
  draft: TileVariant | null;
  isNew: boolean;
}

/**
 * Creates and edits tile variants. Pick a type, then a variant or "New variant". Choose or upload an
 * image, drag it on the preview or type its position and size, name it, and Save.
 */
export function TileVariantEditor() {
  const [config, setConfig] = useState<TileVariantsConfig>(DEFAULT_TILE_VARIANTS_CONFIG);
  const [type, setType] = useState<TileVariantType>('special');
  const [{ draft, isNew }, setEditor] = useState<EditorState>({ draft: null, isNew: false });
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const variants = config.variants.filter((variant) => variant.type === type);

  const edit = (next: TileVariant) => setEditor((prev) => ({ ...prev, draft: next }));

  async function run<T>(action: () => Promise<{ ok: true; value: T } | { ok: false; message: string }>, onOk: (value: T) => void) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) onOk(result.value);
    else setStatus(result.message);
  }

  function handleSave() {
    if (!draft) return;
    const id = isNew ? toVariantId(draft.type, draft.color, draft.name) : draft.id;
    run(() => saveVariant({ ...draft, id }, isNew), (saved) => {
      setConfig(saved);
      setEditor({ draft: { ...draft, id }, isNew: false });
      setStatus('Saved. Reload the game to use it everywhere.');
    });
  }

  function handleDelete() {
    if (!draft || isNew) return;
    run(() => deleteVariant(draft.id), (next) => {
      setConfig(next);
      setEditor({ draft: null, isNew: false });
      setStatus('Deleted.');
    });
  }

  function handleUpload(file: File) {
    if (!draft) return;
    run(() => uploadImage(draft.type, file), ({ config: next, imagePath }) => {
      setConfig(next);
      edit({ ...draft, image: imagePath });
      setStatus('Uploaded and selected.');
    });
  }

  return (
    <div className="flex flex-wrap gap-6">
      <aside className="flex w-56 flex-col gap-2">
        <select value={type} onChange={(event) => { setType(event.target.value as TileVariantType); setEditor({ draft: null, isNew: false }); }} className="rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground">
          {TILE_VARIANT_TYPES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <button type="button" onClick={() => setEditor({ draft: newDraft(type, null), isNew: true })} className={BUTTON_CLASS}>
          New variant
        </button>
        <ul className="flex flex-col gap-1">
          {variants.map((variant) => (
            <li key={variant.id}>
              <button type="button" onClick={() => setEditor({ draft: { ...variant }, isNew: false })} aria-pressed={draft?.id === variant.id} className="w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-secondary">
                {toListLabel(variant)}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {draft ? (
        <>
          <div className="flex w-72 flex-col gap-3">
            <VariantForm draft={draft} isNew={isNew} images={config.images} onChange={edit} onUploadFile={handleUpload} />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleSave} disabled={busy} className={BUTTON_CLASS}>Save</button>
              {!isNew && !draft.id.startsWith('default-') && (
                <button type="button" onClick={handleDelete} disabled={busy} className={BUTTON_CLASS}>Delete</button>
              )}
              {status && <span className="text-sm text-muted-foreground">{status}</span>}
            </div>
            <PlacementPreview config={config} draft={draft} onMove={(x, y) => edit({ ...draft, transform: { ...draft.transform, x, y } })} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Pick a variant on the left, or click New variant.</p>
      )}
    </div>
  );
}
