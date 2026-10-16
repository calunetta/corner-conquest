import {
  BASE_CREST_MIN_PX,
  BASE_CREST_SIZE,
  BASE_RESOURCE_SLOTS,
  BOAT_CORNER_POSITIONS,
  BOAT_SIZE,
  COLLECTOR_IDLE_SPRITES,
  CORNER_TRANSFORMS,
  DUAL_RESOURCE_SLOTS,
  OCCUPANT_CORNER_SLOTS,
  OCCUPANT_SIZE,
  QUAD_RESOURCE_SLOTS,
  SINGLE_RESOURCE_SLOT,
  SPECIAL_ISLAND_IDLE_SPRITE,
  SPECIAL_ISLAND_LEFT,
  SPECIAL_ISLAND_SIZE,
  SPECIAL_ISLAND_TOP,
  TRIPLE_RESOURCE_SLOTS,
  labGameStateFixture,
  toTileResourcesViewModel,
} from '@/modules/map';
import type { CornerId, IslandTileSlotsDraft, SlotDef } from '@/modules/map';
import { PLAYER_DATA } from '@/modules/game-rules';
import { baseIslandWithResources, toReferenceIsland } from './TileDecorationEditor.display.map';
import { SPRITE_CENTER_TRANSFORM } from './TileDecorationEditor.styles';
import type { AnchoredStyle, DefaultElementRowMeta, DefaultElementSlotViewModel } from './TileDecorationEditor.defaultElements.types';

/** The 4 resource-row ids, each backed by a different fixed-count SlotDef table. Shared with
 *  TileDecorationEditor.defaultElements.edit.map.ts, which edits the same tables. */
export type ResourceRowId = 'base-resources' | 'resource-1' | 'resource-2' | 'resource-3' | 'resource-4';

export const CORNER_LABELS: Record<CornerId, string> = {
  br: 'bottom-right',
  tr: 'top-right',
  tl: 'top-left',
  bl: 'bottom-left',
};

/** The 9 rows, in rail display order, grouped by groupLabel. */
export const DEFAULT_ELEMENT_ROWS: DefaultElementRowMeta[] = [
  { id: 'knight', groupLabel: 'Occupants & boats', rowLabel: 'Knight (all corners)', kind: 'corner', referenceIsland: toReferenceIsland('empty-2'), hideTestId: 'tile-occupants' },
  { id: 'boat', groupLabel: 'Occupants & boats', rowLabel: 'Boat (all corners)', kind: 'corner', referenceIsland: toReferenceIsland('empty-2'), hideTestId: 'tile-boats' },
  { id: 'crest', groupLabel: 'Base island', rowLabel: 'Player crest', kind: 'crest', referenceIsland: baseIslandWithResources, hideTestId: null },
  { id: 'base-resources', groupLabel: 'Base island', rowLabel: 'Resource slots (base)', kind: 'resourceSlots', referenceIsland: baseIslandWithResources, hideTestId: 'tile-resources' },
  { id: 'special-art', groupLabel: 'Special island', rowLabel: 'Idle art', kind: 'specialArt', referenceIsland: toReferenceIsland('special'), hideTestId: 'special-content' },
  { id: 'resource-1', groupLabel: 'Resource island', rowLabel: '1 resource node', kind: 'resourceSlots', referenceIsland: toReferenceIsland('resource-1'), hideTestId: 'tile-resources' },
  { id: 'resource-2', groupLabel: 'Resource island', rowLabel: '2 resource nodes', kind: 'resourceSlots', referenceIsland: toReferenceIsland('resource-2'), hideTestId: 'tile-resources' },
  { id: 'resource-3', groupLabel: 'Resource island', rowLabel: '3 resource nodes', kind: 'resourceSlots', referenceIsland: toReferenceIsland('resource-3'), hideTestId: 'tile-resources' },
  { id: 'resource-4', groupLabel: 'Resource island', rowLabel: '4 resource nodes', kind: 'resourceSlots', referenceIsland: toReferenceIsland('resource-4'), hideTestId: 'tile-resources' },
];

/** Deep-clones the real exported constants, so editing the draft never mutates them. */
export function toIslandTileSlotsDraft(): IslandTileSlotsDraft {
  return {
    occupantCornerSlots: OCCUPANT_CORNER_SLOTS.map((corner) => ({ ...corner, style: { ...corner.style } })),
    boatCornerPositions: BOAT_CORNER_POSITIONS.map((corner) => ({ ...corner, style: { ...corner.style } })),
    occupantSize: OCCUPANT_SIZE,
    boatSize: BOAT_SIZE,
    specialIslandTop: SPECIAL_ISLAND_TOP,
    specialIslandLeft: SPECIAL_ISLAND_LEFT,
    specialIslandSize: SPECIAL_ISLAND_SIZE,
    baseCrestSize: BASE_CREST_SIZE,
    baseCrestMinPx: BASE_CREST_MIN_PX,
    singleResourceSlot: { ...SINGLE_RESOURCE_SLOT },
    dualResourceSlots: DUAL_RESOURCE_SLOTS.map((slot) => ({ ...slot })),
    tripleResourceSlots: TRIPLE_RESOURCE_SLOTS.map((slot) => ({ ...slot })),
    quadResourceSlots: QUAD_RESOURCE_SLOTS.map((slot) => ({ ...slot })),
    baseResourceSlots: BASE_RESOURCE_SLOTS.map((slot) => ({ ...slot })),
  };
}

/** The SlotDef[] a resource row's slots live in today. Exported so the edit-math module
 *  (defaultElements.edit.map.ts) can read/write the same tables without duplicating this switch. */
export function getResourceSlotDefs(rowId: ResourceRowId, draft: IslandTileSlotsDraft): SlotDef[] {
  if (rowId === 'base-resources') return draft.baseResourceSlots;
  if (rowId === 'resource-1') return [draft.singleResourceSlot];
  if (rowId === 'resource-2') return draft.dualResourceSlots;
  if (rowId === 'resource-3') return draft.tripleResourceSlots;
  return draft.quadResourceSlots;
}

export function setResourceSlotDefs(rowId: ResourceRowId, draft: IslandTileSlotsDraft, slots: SlotDef[]): IslandTileSlotsDraft {
  if (rowId === 'base-resources') return { ...draft, baseResourceSlots: slots };
  if (rowId === 'resource-1') return { ...draft, singleResourceSlot: slots[0] };
  if (rowId === 'resource-2') return { ...draft, dualResourceSlots: slots };
  if (rowId === 'resource-3') return { ...draft, tripleResourceSlots: slots };
  return { ...draft, quadResourceSlots: slots };
}

/** A SlotDef's own position keys only (not size/transform), in AnchoredStyle shape. */
export function toAnchoredStyle(slotDef: SlotDef): AnchoredStyle {
  const { top, bottom, left, right } = slotDef;
  const style: AnchoredStyle = {};
  if (top !== undefined) style.top = top;
  if (bottom !== undefined) style.bottom = bottom;
  if (left !== undefined) style.left = left;
  if (right !== undefined) style.right = right;
  return style;
}

export function parseNodeIndex(slotId: string): number {
  return Number(slotId.slice('node-'.length));
}

function toCornerSlots(row: DefaultElementRowMeta, draft: IslandTileSlotsDraft): DefaultElementSlotViewModel[] {
  const isKnight = row.id === 'knight';
  const corners = isKnight ? draft.occupantCornerSlots : draft.boatCornerPositions;
  const size = isKnight ? draft.occupantSize : draft.boatSize;
  const elementLabel = isKnight ? 'Knight' : 'Boat';
  const occupants = row.referenceIsland.occupants;

  return corners.map((corner, index) => {
    const occupant = occupants[index];
    const player = occupant ? labGameStateFixture.players.find((p) => p.id === occupant.playerId) : undefined;
    const color = player?.color;
    const image = color ? (isKnight ? PLAYER_DATA[color].sprite.idle : COLLECTOR_IDLE_SPRITES[color]) : '';

    return {
      id: corner.id,
      image,
      ariaLabel: `${elementLabel}, ${CORNER_LABELS[corner.id]} corner`,
      style: corner.style,
      transform: isKnight ? '' : CORNER_TRANSFORMS[corner.id],
      size,
    };
  });
}

function toResourceSlots(row: DefaultElementRowMeta, draft: IslandTileSlotsDraft): DefaultElementSlotViewModel[] {
  const rowId = row.id as ResourceRowId;
  const slotDefs = getResourceSlotDefs(rowId, draft);
  const nodes = toTileResourcesViewModel(row.referenceIsland, rowId === 'base-resources', [], {}) ?? [];

  return slotDefs.map((slotDef, index) => ({
    id: `node-${index}`,
    image: nodes[index]?.spriteSrc ?? '',
    ariaLabel: `Resource node ${index + 1} of ${slotDefs.length}`,
    style: toAnchoredStyle(slotDef),
    transform: SPRITE_CENTER_TRANSFORM,
    size: slotDef.size,
  }));
}

function toSpecialArtSlots(draft: IslandTileSlotsDraft): DefaultElementSlotViewModel[] {
  return [
    {
      id: 'special',
      image: SPECIAL_ISLAND_IDLE_SPRITE,
      ariaLabel: 'Special island art',
      style: { top: draft.specialIslandTop, left: draft.specialIslandLeft },
      transform: SPRITE_CENTER_TRANSFORM,
      size: draft.specialIslandSize,
    },
  ];
}

/** The active row's sprites, built from the draft (not the static constants), so edits show live. */
export function toSlotsForRow(row: DefaultElementRowMeta, draft: IslandTileSlotsDraft): DefaultElementSlotViewModel[] {
  if (row.kind === 'corner') return toCornerSlots(row, draft);
  if (row.kind === 'resourceSlots') return toResourceSlots(row, draft);
  if (row.kind === 'specialArt') return toSpecialArtSlots(draft);
  return [];
}
