import type { IslandTileSlotsDraft } from '@/modules/map';
import {
  getResourceSlotDefs,
  parseNodeIndex,
  setResourceSlotDefs,
  toAnchoredStyle,
} from './TileDecorationEditor.defaultElements.map';
import type { ResourceRowId } from './TileDecorationEditor.defaultElements.map';
import type { AnchoredStyle, DefaultElementRowMeta } from './TileDecorationEditor.defaultElements.types';

export const ANCHORED_OFFSET_MIN = -50;
export const ANCHORED_OFFSET_MAX = 100;

/** The one clamp used for every anchored-style edit (corner rows and center-point rows alike) —
 *  covers every known locked value, including the negative resource center-point BASE_RESOURCE_SLOTS[1].right
 *  (island-tile-slots.types.ts:120) and the negative occupant-corner offsets. */
export function clampAnchoredOffsetPercent(value: number): number {
  return Math.min(ANCHORED_OFFSET_MAX, Math.max(ANCHORED_OFFSET_MIN, value));
}

/** For each key present in previousStyle: top -> clamp(pointerTopPercent); bottom -> clamp(100 - pointerTopPercent);
 *  left -> clamp(pointerLeftPercent); right -> clamp(100 - pointerLeftPercent). Only present keys are touched/returned. */
export function toAnchoredStyleFromPointer(
  previousStyle: AnchoredStyle,
  pointerTopPercent: number,
  pointerLeftPercent: number,
  clamp: (value: number) => number,
): AnchoredStyle {
  const next: AnchoredStyle = {};
  if (previousStyle.top !== undefined) next.top = `${clamp(pointerTopPercent)}%`;
  if (previousStyle.bottom !== undefined) next.bottom = `${clamp(100 - pointerTopPercent)}%`;
  if (previousStyle.left !== undefined) next.left = `${clamp(pointerLeftPercent)}%`;
  if (previousStyle.right !== undefined) next.right = `${clamp(100 - pointerLeftPercent)}%`;
  return next;
}

/** Keyboard equivalent of the drag above: top += dTop; bottom -= dTop; left += dLeft; right -= dLeft,
 *  each clamped, same "only present keys" rule. */
export function nudgeAnchoredStyle(
  previousStyle: AnchoredStyle,
  dTop: number,
  dLeft: number,
  clamp: (value: number) => number,
): AnchoredStyle {
  const next: AnchoredStyle = {};
  if (previousStyle.top !== undefined) next.top = `${clamp(parseFloat(previousStyle.top) + dTop)}%`;
  if (previousStyle.bottom !== undefined) next.bottom = `${clamp(parseFloat(previousStyle.bottom) - dTop)}%`;
  if (previousStyle.left !== undefined) next.left = `${clamp(parseFloat(previousStyle.left) + dLeft)}%`;
  if (previousStyle.right !== undefined) next.right = `${clamp(parseFloat(previousStyle.right) - dLeft)}%`;
  return next;
}

const STYLE_KEY_ORDER: Array<keyof AnchoredStyle> = ['top', 'bottom', 'left', 'right'];

/** e.g. "Bottom -1%, right -5%" / "Top 50%, left 50%" — only the first key is capitalized, in
 *  whichever order the keys appear. */
export function toAnchoredStyleReadout(style: AnchoredStyle): string {
  return STYLE_KEY_ORDER.filter((key) => style[key] !== undefined)
    .map((key, index) => `${index === 0 ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : key} ${style[key]}`)
    .join(', ');
}

function withAnchoredEdit(
  row: DefaultElementRowMeta,
  slotId: string,
  draft: IslandTileSlotsDraft,
  computeNextStyle: (previousStyle: AnchoredStyle) => AnchoredStyle,
): IslandTileSlotsDraft {
  if (row.kind === 'corner') {
    const key = row.id === 'knight' ? 'occupantCornerSlots' : 'boatCornerPositions';
    const slots = draft[key].map((corner) =>
      corner.id === slotId ? { ...corner, style: computeNextStyle(corner.style) } : corner,
    );
    return { ...draft, [key]: slots };
  }

  if (row.kind === 'resourceSlots') {
    const rowId = row.id as ResourceRowId;
    const index = parseNodeIndex(slotId);
    const nextDefs = getResourceSlotDefs(rowId, draft).map((slotDef, i) =>
      i === index ? { ...slotDef, ...computeNextStyle(toAnchoredStyle(slotDef)) } : slotDef,
    );
    return setResourceSlotDefs(rowId, draft, nextDefs);
  }

  if (row.kind === 'specialArt') {
    const nextStyle = computeNextStyle({ top: draft.specialIslandTop, left: draft.specialIslandLeft });
    return {
      ...draft,
      specialIslandTop: nextStyle.top ?? draft.specialIslandTop,
      specialIslandLeft: nextStyle.left ?? draft.specialIslandLeft,
    };
  }

  return draft; // crest: no anchored edits
}

export function applyDragToDraft(
  row: DefaultElementRowMeta,
  slotId: string,
  topPercent: number,
  leftPercent: number,
  draft: IslandTileSlotsDraft,
): IslandTileSlotsDraft {
  return withAnchoredEdit(row, slotId, draft, (previousStyle) =>
    toAnchoredStyleFromPointer(previousStyle, topPercent, leftPercent, clampAnchoredOffsetPercent),
  );
}

export function applyNudgeToDraft(
  row: DefaultElementRowMeta,
  slotId: string,
  dTop: number,
  dLeft: number,
  draft: IslandTileSlotsDraft,
): IslandTileSlotsDraft {
  return withAnchoredEdit(row, slotId, draft, (previousStyle) =>
    nudgeAnchoredStyle(previousStyle, dTop, dLeft, clampAnchoredOffsetPercent),
  );
}

export function applySharedCornerSizeToDraft(
  rowId: 'knight' | 'boat',
  size: number,
  draft: IslandTileSlotsDraft,
): IslandTileSlotsDraft {
  return rowId === 'knight' ? { ...draft, occupantSize: size } : { ...draft, boatSize: size };
}

export function applySlotSizeToDraft(
  row: DefaultElementRowMeta,
  slotId: string,
  size: number,
  draft: IslandTileSlotsDraft,
): IslandTileSlotsDraft {
  if (row.kind === 'specialArt') return { ...draft, specialIslandSize: size };

  if (row.kind === 'resourceSlots') {
    const rowId = row.id as ResourceRowId;
    const index = parseNodeIndex(slotId);
    const nextDefs = getResourceSlotDefs(rowId, draft).map((slotDef, i) => (i === index ? { ...slotDef, size } : slotDef));
    return setResourceSlotDefs(rowId, draft, nextDefs);
  }

  return draft;
}

export function applyCrestFieldToDraft(
  field: 'size' | 'minPx',
  value: number,
  draft: IslandTileSlotsDraft,
): IslandTileSlotsDraft {
  return field === 'size' ? { ...draft, baseCrestSize: value } : { ...draft, baseCrestMinPx: value };
}
