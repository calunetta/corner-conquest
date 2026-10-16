import type { Island } from '@/lib/types';
import type { IslandTileSlotsDraft } from '@/modules/map';

export type DefaultElementRowId =
  | 'knight'
  | 'boat'
  | 'crest'
  | 'base-resources'
  | 'special-art'
  | 'resource-1'
  | 'resource-2'
  | 'resource-3'
  | 'resource-4';

export type DefaultElementKind = 'corner' | 'resourceSlots' | 'specialArt' | 'crest';

export type DefaultElementHideTestId = 'tile-occupants' | 'tile-boats' | 'tile-resources' | 'special-content' | null;

/** Static per-row metadata. DEFAULT_ELEMENT_ROWS (defaultElements.map.ts) is the one array of
 *  these 9, in rail display order, grouped by groupLabel. */
export interface DefaultElementRowMeta {
  id: DefaultElementRowId;
  groupLabel: string; // 'Occupants & boats' | 'Base island' | 'Special island' | 'Resource island'
  rowLabel: string; // e.g. 'Knight (all corners)', exact copy from ui-design.md
  kind: DefaultElementKind;
  referenceIsland: Island;
  hideTestId: DefaultElementHideTestId; // null only for 'crest' (stays visible, see plan Decisions)
}

/** Always exactly two of these four keys set, same convention as CornerPosition['style'] and SlotDef. */
export type AnchoredStyle = Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;

/** One draggable/resizable sprite on the canvas. Absent (empty array) for the 'crest' row. */
export interface DefaultElementSlotViewModel {
  id: string; // CornerId for corner rows; `node-${index}` for resourceSlots; 'special' for specialArt
  image: string;
  ariaLabel: string; // e.g. 'Knight, bottom-right corner' / 'Resource node 2 of 3' / 'Special island art'
  style: AnchoredStyle;
  transform: string; // CORNER_TRANSFORMS[cornerId] for boat; '' for knight; SPRITE_CENTER_TRANSFORM for the rest
  size: number; // % of tile; shared (ignored per-slot) for corner rows, per-slot otherwise
}

export interface SaveDefaultElementsRequestBody {
  draft: IslandTileSlotsDraft;
}
