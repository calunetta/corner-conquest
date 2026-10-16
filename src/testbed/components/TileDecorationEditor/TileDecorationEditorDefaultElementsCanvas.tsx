'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { styles } from './TileDecorationEditor.styles';
import { TileDecorationEditorReferenceTile } from './TileDecorationEditorReferenceTile';
import { TileDecorationEditorSprite } from './TileDecorationEditorSprite';
import type {
  AnchoredStyle,
  DefaultElementHideTestId,
  DefaultElementRowMeta,
  DefaultElementSlotViewModel,
} from './TileDecorationEditor.defaultElements.types';

const CREST_BADGE_LABEL = 'Centered — size only';

const HIDE_CLASS_BY_TEST_ID: Record<Exclude<DefaultElementHideTestId, null>, string> = {
  'tile-occupants': styles.hideOccupants,
  'tile-boats': styles.hideBoats,
  'tile-resources': styles.hideResources,
  'special-content': styles.hideSpecialContent,
};

/** Combines a slot's own anchored position keys with its shared/per-slot size and corner
 *  transform into the fully-computed style TileDecorationEditorSprite needs. */
function toSlotStyle(slot: DefaultElementSlotViewModel): CSSProperties {
  const anchoredPosition: AnchoredStyle = slot.style;
  return {
    ...anchoredPosition,
    width: `${slot.size}%`,
    height: `${slot.size}%`,
    transform: slot.transform,
  };
}

interface TileDecorationEditorDefaultElementsCanvasProps {
  activeRow: DefaultElementRowMeta;
  slots: DefaultElementSlotViewModel[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  onDragSlot: (slotId: string, topPercent: number, leftPercent: number) => void;
  onNudgeSlot: (slotId: string, dTop: number, dLeft: number) => void;
}

/** Same canvas shell and sprite interaction as the Decorations mode, fed by the active default-
 *  element row instead of a decoration layout. The Player-crest row has no draggable sprite: the
 *  crest has no position fields in island-tile-slots.types.ts, so the canvas shows the real
 *  (non-hidden) crest plus a non-interactive "Centered — size only" badge instead. */
export function TileDecorationEditorDefaultElementsCanvas({
  activeRow,
  slots,
  selectedSlotId,
  onSelectSlot,
  onDragSlot,
  onNudgeSlot,
}: TileDecorationEditorDefaultElementsCanvasProps) {
  const hideClass = activeRow.hideTestId ? HIDE_CLASS_BY_TEST_ID[activeRow.hideTestId] : '';

  return (
    <div className={cn(styles.tileFrame, hideClass)}>
      <TileDecorationEditorReferenceTile island={activeRow.referenceIsland} />
      <div className={styles.decorationOverlay}>
        {slots.map((slot) => (
          <TileDecorationEditorSprite
            key={slot.id}
            image={slot.image}
            ariaLabel={slot.ariaLabel}
            style={toSlotStyle(slot)}
            isSelected={slot.id === selectedSlotId}
            onSelect={() => onSelectSlot(slot.id)}
            onDrag={(top, left) => onDragSlot(slot.id, top, left)}
            onNudge={(dTop, dLeft) => onNudgeSlot(slot.id, dTop, dLeft)}
          />
        ))}
      </div>
      {activeRow.kind === 'crest' && (
        <div className={styles.crestBadge}>
          <span className={styles.crestBadgeLabel}>{CREST_BADGE_LABEL}</span>
        </div>
      )}
    </div>
  );
}
