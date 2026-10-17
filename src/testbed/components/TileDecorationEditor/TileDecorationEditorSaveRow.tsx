'use client';

import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { styles } from './TileDecorationEditor.styles';
import type { EditorStatus } from './TileDecorationEditor.types';

const STATUS_TEXT: Record<EditorStatus, string> = {
  idle: '',
  saving: '',
  saved: 'Saved.',
  error: 'Could not save — see console.',
  conflict: 'Changed elsewhere. Reload the page to load the saved version; unsaved edits will be lost.',
};

interface TileDecorationEditorSaveRowProps {
  isDirty: boolean;
  status: EditorStatus;
  onSave: () => void;
  /** Mode-specific one-line warning shown under the Save row, e.g. the default-elements
   *  mode's "writes directly to island-tile-slots.types.ts" notice. Omitted in Decorations mode. */
  warningText?: string;
}

/** The Save button and its Unsaved-changes/Saving/Saved/Error status text, shared by both editing
 *  modes' action rows so the two never drift from each other. */
export function TileDecorationEditorSaveRow({ isDirty, status, onSave, warningText }: TileDecorationEditorSaveRowProps) {
  const isSaving = status === 'saving';

  return (
    <div className={styles.fieldStack}>
      <div className={styles.saveRow}>
        <Button type="button" size="sm" disabled={!isDirty || isSaving} onClick={onSave}>
          {isSaving ? <Loader2 className={styles.spinner} aria-hidden /> : <Save className={styles.icon} aria-hidden />}
          Save
        </Button>
        <p role="status" className={styles.statusText({ status })}>
          {STATUS_TEXT[status]}
        </p>
      </div>
      {warningText && <p className={styles.saveWarningText}>{warningText}</p>}
    </div>
  );
}
