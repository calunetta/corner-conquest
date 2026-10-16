import { useCallback, useEffect, useRef, useState } from 'react';
import type { IslandTileSlotsDraft } from '@/modules/map';
import {
  applyCrestFieldToDraft,
  applyDragToDraft,
  applyNudgeToDraft,
  applySharedCornerSizeToDraft,
  applySlotSizeToDraft,
} from './TileDecorationEditor.defaultElements.edit.map';
import { DEFAULT_ELEMENT_ROWS, toIslandTileSlotsDraft, toSlotsForRow } from './TileDecorationEditor.defaultElements.map';
import type { DefaultElementRowId, DefaultElementRowMeta, DefaultElementSlotViewModel } from './TileDecorationEditor.defaultElements.types';
import { saveDefaultElements } from './TileDecorationEditor.service';
import type { EditorStatus } from './TileDecorationEditor.types';

const SAVED_BADGE_DURATION_MS = 2000;

export interface DefaultElementsEditorState {
  draft: IslandTileSlotsDraft;
  activeRowId: DefaultElementRowId;
  activeRow: DefaultElementRowMeta;
  slots: DefaultElementSlotViewModel[]; // for activeRow
  selectedSlotId: string | null;
  isDirty: boolean;
  status: EditorStatus;
  onSelectRow: (rowId: DefaultElementRowId) => void; // resets selectedSlotId to null
  onSelectSlot: (slotId: string | null) => void;
  onDragSlot: (slotId: string, topPercent: number, leftPercent: number) => void;
  onNudgeSlot: (slotId: string, dTop: number, dLeft: number) => void;
  onResizeSharedCornerSize: (size: number) => void; // knight/boat rows only
  onResizeSlot: (slotId: string, size: number) => void; // resourceSlots/specialArt rows only
  onResizeCrest: (field: 'size' | 'minPx', value: number) => void;
  onSave: () => void;
  clearSelection: () => void;
}

function findRow(rowId: DefaultElementRowId): DefaultElementRowMeta {
  const row = DEFAULT_ELEMENT_ROWS.find((candidate) => candidate.id === rowId);
  if (!row) throw new Error(`Unknown default-element row id: ${rowId}`);
  return row;
}

/** Adapts the Default-elements draft into the editor's view model for the active row: row
 *  navigation, slot selection, and the drag/nudge/resize/save handlers. The draft is edited
 *  entirely in memory; onSave is the only place it leaves the component. */
export function useDefaultElementsEditor(): DefaultElementsEditorState {
  const [draft, setDraft] = useState<IslandTileSlotsDraft>(toIslandTileSlotsDraft);
  const [activeRowId, setActiveRowId] = useState<DefaultElementRowId>(DEFAULT_ELEMENT_ROWS[0].id);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState<EditorStatus>('idle');
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef(draft);
  latestDraftRef.current = draft;

  useEffect(() => () => {
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
  }, []);

  const activeRow = findRow(activeRowId);
  const slots = toSlotsForRow(activeRow, draft);

  const applyEdit = useCallback((updater: (current: IslandTileSlotsDraft) => IslandTileSlotsDraft) => {
    setDraft((current) => updater(current));
    setIsDirty(true);
  }, []);

  const onSelectRow = useCallback((rowId: DefaultElementRowId) => {
    setActiveRowId(rowId);
    setSelectedSlotId(null);
  }, []);

  const onDragSlot = useCallback(
    (slotId: string, topPercent: number, leftPercent: number) =>
      applyEdit((current) => applyDragToDraft(activeRow, slotId, topPercent, leftPercent, current)),
    [activeRow, applyEdit],
  );

  const onNudgeSlot = useCallback(
    (slotId: string, dTop: number, dLeft: number) =>
      applyEdit((current) => applyNudgeToDraft(activeRow, slotId, dTop, dLeft, current)),
    [activeRow, applyEdit],
  );

  const onResizeSharedCornerSize = useCallback(
    (size: number) => applyEdit((current) => applySharedCornerSizeToDraft(activeRowId as 'knight' | 'boat', size, current)),
    [activeRowId, applyEdit],
  );

  const onResizeSlot = useCallback(
    (slotId: string, size: number) => applyEdit((current) => applySlotSizeToDraft(activeRow, slotId, size, current)),
    [activeRow, applyEdit],
  );

  const onResizeCrest = useCallback(
    (field: 'size' | 'minPx', value: number) => applyEdit((current) => applyCrestFieldToDraft(field, value, current)),
    [applyEdit],
  );

  const onSave = useCallback(() => {
    const savedDraft = draft;
    setStatus('saving');
    saveDefaultElements(savedDraft)
      .then(() => {
        // An edit made while the request was in flight is not in savedDraft, so the editor must stay dirty.
        if (latestDraftRef.current === savedDraft) setIsDirty(false);
        setStatus('saved');
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setStatus('idle'), SAVED_BADGE_DURATION_MS);
      })
      .catch((error: unknown) => {
        console.error('Failed to save default elements', error);
        setStatus('error');
      });
  }, [draft]);

  const clearSelection = useCallback(() => setSelectedSlotId(null), []);

  return {
    draft,
    activeRowId,
    activeRow,
    slots,
    selectedSlotId,
    isDirty,
    status,
    onSelectRow,
    onSelectSlot: setSelectedSlotId,
    onDragSlot,
    onNudgeSlot,
    onResizeSharedCornerSize,
    onResizeSlot,
    onResizeCrest,
    onSave,
    clearSelection,
  };
}
