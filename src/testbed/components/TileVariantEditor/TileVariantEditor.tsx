'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TILE_VARIANT_TYPES, type TileVariant, type TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toVariantId } from '@/modules/map/components/TileVariants/TileVariants.validate';
import { deleteImage, deleteVariant, saveVariant, uploadImage } from './TileVariantEditor.api';
import { useSavedVariantConfig } from './TileVariantEditor.saved';
import { hasUnsavedChanges, newDraft, toDecorationEditorHref, toListLabel, toRevertedDefault } from './TileVariantEditor.draft';
import { VariantForm } from './TileVariantEditor.form';
import { PlacementPreview } from './TileVariantEditor.placement';

const BUTTON_CLASS = 'rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground disabled:opacity-50';
/** Status after a save: the pull request for live saves, or a reminder to reload for local ones. */
function savedMessage(pullRequestUrl: string | null): string {
  return pullRequestUrl ? `Saved to a pull request: ${pullRequestUrl}` : 'Saved. Reload the game to use it everywhere.';
}

const SELECTED_CLASS = 'bg-primary/20 ring-1 ring-primary';

interface EditorState {
  draft: TileVariant | null;
  isNew: boolean;
}

/**
 * Creates and edits tile variants. Pick a type, then a variant or "New variant". Choose or upload an
 * image, drag it on the preview or type its position and size, name it, and Save.
 */
export function TileVariantEditor() {
  const [type, setType] = useState<TileVariantType>('special');
  const [{ draft, isNew }, setEditor] = useState<EditorState>({ draft: null, isNew: false });
  const [status, setStatus] = useState<string | null>(null);
  const { config, busy, changeConfig, changePicture } = useSavedVariantConfig(setStatus);
  const variants = config.variants.filter((variant) => variant.type === type);
  const isDefault = draft !== null && !isNew && draft.id.startsWith('default-');
  const savedDraft = config.variants.find((variant) => variant.id === draft?.id);
  const isDirty = draft !== null && !isNew && hasUnsavedChanges(draft, savedDraft);

  const edit = (next: TileVariant) => setEditor((prev) => ({ ...prev, draft: next }));

  function handleSave() {
    if (!draft) return;
    const id = isNew ? toVariantId(draft.type, draft.color, draft.name) : draft.id;
    changeConfig((baseSha) => saveVariant({ ...draft, id }, isNew, baseSha), (pullRequestUrl) => {
      setEditor({ draft: { ...draft, id }, isNew: false });
      setStatus(savedMessage(pullRequestUrl));
    });
  }

  function handleDelete() {
    if (!draft || isNew) return;
    changeConfig((baseSha) => deleteVariant(draft.id, baseSha), () => {
      setEditor({ draft: null, isNew: false });
      setStatus('Deleted.');
    });
  }

  function handleRevert() {
    if (!draft || !isDefault) return;
    const reverted = toRevertedDefault(draft);
    changeConfig((baseSha) => saveVariant(reverted, false, baseSha), (pullRequestUrl) => {
      setEditor({ draft: reverted, isNew: false });
      setStatus('Reverted to the default look. ' + savedMessage(pullRequestUrl));
    });
  }

  function handleUpload(file: File) {
    if (!draft) return;
    changePicture(() => uploadImage(draft.type, file), ({ imagePath }) => {
      edit({ ...draft, image: imagePath });
      setStatus('Uploaded and selected.');
    });
  }

  function handleDeleteImage() {
    if (!draft?.image) return;
    const imagePath = draft.image;
    changePicture(() => deleteImage(imagePath), () => {
      edit({ ...draft, image: null });
      setStatus('Picture deleted. Save to keep the change.');
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <aside className="flex w-48 flex-col gap-2">
        <select value={type} onChange={(event) => { setType(event.target.value as TileVariantType); setEditor({ draft: null, isNew: false }); }} className="rounded-md border border-border bg-secondary px-2 py-1.5 text-sm text-foreground">
          {TILE_VARIANT_TYPES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditor({ draft: newDraft(type, null), isNew: true })}
          aria-pressed={isNew}
          className={`${BUTTON_CLASS} ${isNew ? SELECTED_CLASS : ''}`}
        >
          New variant
        </button>
        <ul className="flex flex-col gap-1">
          {variants.map((variant) => {
            const selected = !isNew && draft?.id === variant.id;
            return (
              <li key={variant.id}>
                <button
                  type="button"
                  onClick={() => setEditor({ draft: { ...variant }, isNew: false })}
                  aria-pressed={selected}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-secondary ${selected ? SELECTED_CLASS : ''}`}
                >
                  {toListLabel(variant)}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {draft ? (
        <>
          <div className="flex w-64 flex-col gap-3">
            <VariantForm draft={draft} isNew={isNew} images={config.images} onChange={edit} onUploadFile={handleUpload} />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSave} disabled={busy} className={BUTTON_CLASS}>Save</button>
              {draft.image && (
                <button type="button" onClick={handleDeleteImage} disabled={busy} className={BUTTON_CLASS}>Delete picture</button>
              )}
              {isDefault && (
                <button type="button" onClick={handleRevert} disabled={busy} className={BUTTON_CLASS}>Revert to default</button>
              )}
              {!isNew && !isDefault && (
                <button type="button" onClick={handleDelete} disabled={busy} className={BUTTON_CLASS}>Delete variant</button>
              )}
              {!isNew && !isDefault && !isDirty && (
                <Link href={toDecorationEditorHref(draft)} className={BUTTON_CLASS}>Edit decorations</Link>
              )}
              {isDirty && <span className="text-sm text-muted-foreground">Save first to edit decorations.</span>}
            </div>
            {status && <span className="text-sm text-muted-foreground">{status}</span>}
            <PlacementPreview config={config} draft={draft} onMove={(x, y) => edit({ ...draft, transform: { ...draft.transform, x, y } })} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Pick a variant on the left, or click New variant.</p>
      )}
    </div>
  );
}
