'use client';

import { useState } from 'react';
import { Copy, Loader2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TileDecorationEditorDeleteButton } from './TileDecorationEditorDeleteButton';
import { TileDecorationEditorNameField } from './TileDecorationEditorNameField';
import { styles } from './TileDecorationEditor.styles';
import type { EditorStatus, TileDecorationEditorViewModel } from './TileDecorationEditor.types';

const STATUS_TEXT: Record<EditorStatus, string> = {
  idle: '',
  saving: '',
  saved: 'Saved.',
  error: 'Could not save — see console.',
};

type LayoutEditMode = 'idle' | 'adding' | 'renaming';

export interface TileDecorationEditorLayoutActionsProps
  extends Pick<
    TileDecorationEditorViewModel,
    | 'isDirty'
    | 'status'
    | 'canDeleteActiveLayout'
    | 'onAddLayout'
    | 'onDuplicateLayout'
    | 'onRenameLayout'
    | 'onDeleteLayout'
    | 'onSave'
  > {
  scenarioLabel: string;
  layoutName: string;
}

/** Add, Duplicate, Rename, Delete and Save for the active layout. Add and Rename share one inline
 *  name field in this row. Add, Duplicate and Delete are disabled while there are unsaved changes,
 *  so Save is the only way forward, per the spec. */
export function TileDecorationEditorLayoutActions({
  isDirty,
  status,
  canDeleteActiveLayout,
  scenarioLabel,
  layoutName,
  onAddLayout,
  onDuplicateLayout,
  onRenameLayout,
  onDeleteLayout,
  onSave,
}: TileDecorationEditorLayoutActionsProps) {
  const [editMode, setEditMode] = useState<LayoutEditMode>('idle');
  const isSaving = status === 'saving';

  function handleNameSubmit(name: string) {
    if (editMode === 'adding') onAddLayout(name);
    if (editMode === 'renaming') onRenameLayout(name);
    setEditMode('idle');
  }

  return (
    <div className={styles.fieldStack}>
      {editMode === 'idle' ? (
        <div className={styles.actionRow}>
          <Button type="button" variant="outline" size="sm" disabled={isDirty} onClick={() => setEditMode('adding')}>
            <Plus className={styles.icon} aria-hidden />
            Add layout
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isDirty} onClick={onDuplicateLayout}>
            <Copy className={styles.icon} aria-hidden />
            Duplicate
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditMode('renaming')}>
            Rename
          </Button>
          <TileDecorationEditorDeleteButton
            isDirty={isDirty}
            canDeleteActiveLayout={canDeleteActiveLayout}
            scenarioLabel={scenarioLabel}
            layoutName={layoutName}
            onDeleteLayout={onDeleteLayout}
          />
        </div>
      ) : (
        <TileDecorationEditorNameField
          label={editMode === 'adding' ? 'New layout name' : 'Layout name'}
          initialValue={editMode === 'renaming' ? layoutName : ''}
          onSubmit={handleNameSubmit}
          onCancel={() => setEditMode('idle')}
        />
      )}

      <div className={styles.saveRow}>
        <Button type="button" size="sm" disabled={!isDirty || isSaving} onClick={onSave}>
          {isSaving ? <Loader2 className={styles.spinner} aria-hidden /> : <Save className={styles.icon} aria-hidden />}
          Save
        </Button>
        <p role="status" className={styles.statusText({ status })}>
          {STATUS_TEXT[status]}
        </p>
      </div>
    </div>
  );
}
