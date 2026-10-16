'use client';

import { TileDecorationEditorSaveRow } from './TileDecorationEditorSaveRow';
import type { EditorStatus } from './TileDecorationEditor.types';

const SAVE_WARNING_TEXT = 'Saving writes directly to island-tile-slots.types.ts.';

interface TileDecorationEditorDefaultElementsActionsProps {
  isDirty: boolean;
  status: EditorStatus;
  onSave: () => void;
}

/** Default-elements mode has no Add/Duplicate/Rename/Delete — there is exactly one instance of
 *  each element kind — so this is only the shared Save row plus its mode-specific warning. */
export function TileDecorationEditorDefaultElementsActions({
  isDirty,
  status,
  onSave,
}: TileDecorationEditorDefaultElementsActionsProps) {
  return <TileDecorationEditorSaveRow isDirty={isDirty} status={status} onSave={onSave} warningText={SAVE_WARNING_TEXT} />;
}
