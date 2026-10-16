'use client';

import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toAnchoredStyleReadout } from './TileDecorationEditor.defaultElements.edit.map';
import { styles } from './TileDecorationEditor.styles';
import type { DefaultElementRowMeta, DefaultElementSlotViewModel } from './TileDecorationEditor.defaultElements.types';
import type { IslandTileSlotsDraft } from '@/modules/map';

const NO_SELECTION_TEXT = 'Click a decoration on the tile to edit it.';
const SHARED_CORNER_SIZE_LABEL = 'Size (applies to all 4 corners)';
const PER_SLOT_SIZE_LABEL = 'Size (% of tile)';
const CREST_SIZE_LABEL = 'Size (% of tile)';
const CREST_MIN_PX_LABEL = 'Minimum size (px)';

interface TileDecorationEditorDefaultElementsInspectorProps {
  activeRow: DefaultElementRowMeta;
  draft: IslandTileSlotsDraft;
  selectedSlot: DefaultElementSlotViewModel | null;
  onResizeSharedCornerSize: (size: number) => void;
  onResizeSlot: (slotId: string, size: number) => void;
  onResizeCrest: (field: 'size' | 'minPx', value: number) => void;
}

/** Per-row-kind fields for the active default element: shared corner Size (knight/boat), a
 *  per-slot Size (resource nodes/special art), or the two crest fields. Never renders a
 *  Layer (z-index) field — layering is fixed in this mode, per the ui-design.md Final spec. */
export function TileDecorationEditorDefaultElementsInspector({
  activeRow,
  draft,
  selectedSlot,
  onResizeSharedCornerSize,
  onResizeSlot,
  onResizeCrest,
}: TileDecorationEditorDefaultElementsInspectorProps) {
  return (
    <aside className={cn(styles.panel, styles.inspectorPanel)} aria-label="Default element inspector">
      <h2 className={styles.panelTitle}>Selected element</h2>
      {renderFields({ activeRow, draft, selectedSlot, onResizeSharedCornerSize, onResizeSlot, onResizeCrest })}
    </aside>
  );
}

function renderFields({
  activeRow,
  draft,
  selectedSlot,
  onResizeSharedCornerSize,
  onResizeSlot,
  onResizeCrest,
}: TileDecorationEditorDefaultElementsInspectorProps) {
  if (activeRow.kind === 'crest') {
    return (
      <CrestFields
        baseCrestSize={draft.baseCrestSize}
        baseCrestMinPx={draft.baseCrestMinPx}
        onResizeCrest={onResizeCrest}
      />
    );
  }

  if (!selectedSlot) {
    return <p className={styles.emptyText}>{NO_SELECTION_TEXT}</p>;
  }

  if (activeRow.kind === 'corner') {
    return (
      <SharedCornerSizeField
        size={selectedSlot.size}
        readout={toAnchoredStyleReadout(selectedSlot.style)}
        onResizeSharedCornerSize={onResizeSharedCornerSize}
      />
    );
  }

  return <PerSlotSizeField slot={selectedSlot} onResizeSlot={onResizeSlot} />;
}

interface SharedCornerSizeFieldProps {
  size: number;
  readout: string;
  onResizeSharedCornerSize: (size: number) => void;
}

function SharedCornerSizeField({ size, readout, onResizeSharedCornerSize }: SharedCornerSizeFieldProps) {
  return (
    <div className={styles.fieldStack}>
      <label className={styles.fieldRow}>
        <span className={styles.label}>{SHARED_CORNER_SIZE_LABEL}</span>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={size}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onResizeSharedCornerSize(Number(event.target.value))}
        />
      </label>
      <p className={styles.readout}>{readout}</p>
    </div>
  );
}

interface PerSlotSizeFieldProps {
  slot: DefaultElementSlotViewModel;
  onResizeSlot: (slotId: string, size: number) => void;
}

function PerSlotSizeField({ slot, onResizeSlot }: PerSlotSizeFieldProps) {
  return (
    <div className={styles.fieldStack}>
      <label className={styles.fieldRow}>
        <span className={styles.label}>{PER_SLOT_SIZE_LABEL}</span>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={slot.size}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onResizeSlot(slot.id, Number(event.target.value))}
        />
      </label>
      <p className={styles.readout}>{toAnchoredStyleReadout(slot.style)}</p>
    </div>
  );
}

interface CrestFieldsProps {
  baseCrestSize: number;
  baseCrestMinPx: number;
  onResizeCrest: (field: 'size' | 'minPx', value: number) => void;
}

function CrestFields({ baseCrestSize, baseCrestMinPx, onResizeCrest }: CrestFieldsProps) {
  return (
    <div className={styles.instanceFields}>
      <label className={styles.fieldRow}>
        <span className={styles.label}>{CREST_SIZE_LABEL}</span>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={baseCrestSize}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onResizeCrest('size', Number(event.target.value))}
        />
      </label>
      <label className={styles.fieldRow}>
        <span className={styles.label}>{CREST_MIN_PX_LABEL}</span>
        <Input
          type="number"
          min={0}
          step={1}
          value={baseCrestMinPx}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onResizeCrest('minPx', Number(event.target.value))}
        />
      </label>
    </div>
  );
}
