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
} from '@/modules/map';
import type { IslandTileSlotsDraft } from '@/modules/map';
import { PLAYER_DATA } from '@/modules/game-rules';
import {
  CORNER_LABELS,
  DEFAULT_ELEMENT_ROWS,
  getResourceSlotDefs,
  parseNodeIndex,
  setResourceSlotDefs,
  toAnchoredStyle,
  toIslandTileSlotsDraft,
  toSlotsForRow,
} from './TileDecorationEditor.defaultElements.map';
import type { DefaultElementRowMeta } from './TileDecorationEditor.defaultElements.types';

function findRow(id: DefaultElementRowMeta['id']): DefaultElementRowMeta {
  const row = DEFAULT_ELEMENT_ROWS.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`No DEFAULT_ELEMENT_ROWS entry for ${id}`);
  return row;
}

describe('CORNER_LABELS', () => {
  it('pins the human-readable label for each corner id', () => {
    expect(CORNER_LABELS).toEqual({
      br: 'bottom-right',
      tr: 'top-right',
      tl: 'top-left',
      bl: 'bottom-left',
    });
  });
});

describe('DEFAULT_ELEMENT_ROWS', () => {
  it('lists exactly the 9 rows, in rail display order', () => {
    expect(DEFAULT_ELEMENT_ROWS.map((row) => row.id)).toEqual([
      'knight',
      'boat',
      'crest',
      'base-resources',
      'special-art',
      'resource-1',
      'resource-2',
      'resource-3',
      'resource-4',
    ]);
  });

  it('hides a different real layer per row, and null only for crest', () => {
    const hideTestIdsById = Object.fromEntries(DEFAULT_ELEMENT_ROWS.map((row) => [row.id, row.hideTestId]));
    expect(hideTestIdsById).toEqual({
      knight: 'tile-occupants',
      boat: 'tile-boats',
      crest: null,
      'base-resources': 'tile-resources',
      'special-art': 'special-content',
      'resource-1': 'tile-resources',
      'resource-2': 'tile-resources',
      'resource-3': 'tile-resources',
      'resource-4': 'tile-resources',
    });
  });
});

describe('toIslandTileSlotsDraft', () => {
  it('deep-clones every real exported constant', () => {
    const draft = toIslandTileSlotsDraft();

    expect(draft).toEqual<IslandTileSlotsDraft>({
      occupantCornerSlots: OCCUPANT_CORNER_SLOTS,
      boatCornerPositions: BOAT_CORNER_POSITIONS,
      occupantSize: OCCUPANT_SIZE,
      boatSize: BOAT_SIZE,
      specialIslandTop: SPECIAL_ISLAND_TOP,
      specialIslandLeft: SPECIAL_ISLAND_LEFT,
      specialIslandSize: SPECIAL_ISLAND_SIZE,
      baseCrestSize: BASE_CREST_SIZE,
      baseCrestMinPx: BASE_CREST_MIN_PX,
      singleResourceSlot: SINGLE_RESOURCE_SLOT,
      dualResourceSlots: DUAL_RESOURCE_SLOTS,
      tripleResourceSlots: TRIPLE_RESOURCE_SLOTS,
      quadResourceSlots: QUAD_RESOURCE_SLOTS,
      baseResourceSlots: BASE_RESOURCE_SLOTS,
    });
  });

  it('never shares a reference with the real constants: mutating the draft leaves them untouched', () => {
    const draft = toIslandTileSlotsDraft();
    const originalOccupantBrStyle = { ...OCCUPANT_CORNER_SLOTS[0].style };
    const originalBaseResourceSlot1 = { ...BASE_RESOURCE_SLOTS[1] };

    draft.occupantCornerSlots[0].style.right = '-99%';
    draft.baseResourceSlots[1].size = 999;
    draft.boatCornerPositions.push({ id: 'br', style: {} });
    draft.dualResourceSlots.push({ top: '0%', left: '0%', size: 1 });

    expect(OCCUPANT_CORNER_SLOTS[0].style).toEqual(originalOccupantBrStyle);
    expect(BASE_RESOURCE_SLOTS[1]).toEqual(originalBaseResourceSlot1);
    expect(BOAT_CORNER_POSITIONS).toHaveLength(4);
    expect(DUAL_RESOURCE_SLOTS).toHaveLength(2);
  });
});

describe('toAnchoredStyle', () => {
  it('copies only the position keys present on a SlotDef, dropping size/transform', () => {
    expect(toAnchoredStyle({ top: '45%', right: '-17%', size: 30 })).toEqual({ top: '45%', right: '-17%' });
  });

  it('returns an empty object for a SlotDef with no position keys', () => {
    expect(toAnchoredStyle({ size: 10 })).toEqual({});
  });
});

describe('getResourceSlotDefs / setResourceSlotDefs', () => {
  it.each([
    ['base-resources' as const, 'baseResourceSlots' as const],
    ['resource-2' as const, 'dualResourceSlots' as const],
    ['resource-3' as const, 'tripleResourceSlots' as const],
    ['resource-4' as const, 'quadResourceSlots' as const],
  ])('reads %s from draft.%s', (rowId, draftKey) => {
    const draft = toIslandTileSlotsDraft();
    expect(getResourceSlotDefs(rowId, draft)).toBe(draft[draftKey]);
  });

  it('reads resource-1 as a single-element array wrapping draft.singleResourceSlot', () => {
    const draft = toIslandTileSlotsDraft();
    expect(getResourceSlotDefs('resource-1', draft)).toEqual([draft.singleResourceSlot]);
  });

  it('writes resource-1 back to draft.singleResourceSlot unwrapped (not as an array)', () => {
    const draft = toIslandTileSlotsDraft();
    const nextSlot = { top: '1%', left: '2%', size: 99 };

    const next = setResourceSlotDefs('resource-1', draft, [nextSlot]);

    expect(next.singleResourceSlot).toEqual(nextSlot);
    expect(draft.singleResourceSlot).not.toEqual(nextSlot); // original draft untouched
  });

  it.each([
    ['base-resources' as const, 'baseResourceSlots' as const],
    ['resource-2' as const, 'dualResourceSlots' as const],
    ['resource-3' as const, 'tripleResourceSlots' as const],
    ['resource-4' as const, 'quadResourceSlots' as const],
  ])('writes %s back to draft.%s without mutating the input draft', (rowId, draftKey) => {
    const draft = toIslandTileSlotsDraft();
    const originalLength = draft[draftKey].length;
    const nextSlots = [{ top: '1%', left: '2%', size: 99 }];

    const next = setResourceSlotDefs(rowId, draft, nextSlots);

    expect(next[draftKey]).toBe(nextSlots);
    expect(draft[draftKey]).toHaveLength(originalLength);
  });
});

describe('parseNodeIndex', () => {
  it.each([
    ['node-0', 0],
    ['node-3', 3],
  ])('parses the numeric index out of %s', (slotId, expected) => {
    expect(parseNodeIndex(slotId)).toBe(expected);
  });
});

describe('toSlotsForRow', () => {
  it('returns one slot per corner for the knight row, in br/tr/tl/bl order, with each occupant player\'s idle sprite', () => {
    const row = findRow('knight');
    const draft = toIslandTileSlotsDraft();

    const slots = toSlotsForRow(row, draft);

    expect(slots.map((slot) => slot.id)).toEqual(['br', 'tr', 'tl', 'bl']);
    expect(slots.map((slot) => slot.ariaLabel)).toEqual([
      'Knight, bottom-right corner',
      'Knight, top-right corner',
      'Knight, top-left corner',
      'Knight, bottom-left corner',
    ]);
    expect(slots.map((slot) => slot.image)).toEqual([
      PLAYER_DATA.blue.sprite.idle,
      PLAYER_DATA.red.sprite.idle,
      PLAYER_DATA.purple.sprite.idle,
      PLAYER_DATA.yellow.sprite.idle,
    ]);
    // Knight corners are flush-anchored, not centered on the point: no transform.
    expect(slots.every((slot) => slot.transform === '')).toBe(true);
    expect(slots.every((slot) => slot.size === draft.occupantSize)).toBe(true);
  });

  it('returns one slot per corner for the boat row, with each occupant player\'s collector-idle sprite and the corner-centering transform', () => {
    const row = findRow('boat');
    const draft = toIslandTileSlotsDraft();

    const slots = toSlotsForRow(row, draft);

    expect(slots.map((slot) => slot.id)).toEqual(['br', 'tr', 'tl', 'bl']);
    expect(slots.map((slot) => slot.image)).toEqual([
      COLLECTOR_IDLE_SPRITES.blue,
      COLLECTOR_IDLE_SPRITES.red,
      COLLECTOR_IDLE_SPRITES.purple,
      COLLECTOR_IDLE_SPRITES.yellow,
    ]);
    expect(slots.map((slot) => slot.transform)).toEqual([
      CORNER_TRANSFORMS.br,
      CORNER_TRANSFORMS.tr,
      CORNER_TRANSFORMS.tl,
      CORNER_TRANSFORMS.bl,
    ]);
    expect(slots.every((slot) => slot.size === draft.boatSize)).toBe(true);
  });

  it('returns image/position/size by array index for a resourceSlots row (base-resources: 3 slots)', () => {
    const row = findRow('base-resources');
    const draft = toIslandTileSlotsDraft();

    const slots = toSlotsForRow(row, draft);

    expect(slots).toHaveLength(3);
    expect(slots.map((slot) => slot.id)).toEqual(['node-0', 'node-1', 'node-2']);
    expect(slots.every((slot) => slot.image !== '')).toBe(true);
    expect(slots[1].style).toEqual({ top: '40%', right: '-12%' });
    expect(slots[1].size).toBe(30);
  });

  it('returns exactly N slots for the resource-N rows', () => {
    expect(toSlotsForRow(findRow('resource-1'), toIslandTileSlotsDraft())).toHaveLength(1);
    expect(toSlotsForRow(findRow('resource-2'), toIslandTileSlotsDraft())).toHaveLength(2);
    expect(toSlotsForRow(findRow('resource-3'), toIslandTileSlotsDraft())).toHaveLength(3);
    expect(toSlotsForRow(findRow('resource-4'), toIslandTileSlotsDraft())).toHaveLength(4);
  });

  it('returns one centered slot for the specialArt row, sized/positioned from the draft', () => {
    const row = findRow('special-art');
    const draft = toIslandTileSlotsDraft();

    const slots = toSlotsForRow(row, draft);

    expect(slots).toEqual([
      {
        id: 'special',
        image: SPECIAL_ISLAND_IDLE_SPRITE,
        ariaLabel: 'Special island art',
        style: { top: draft.specialIslandTop, left: draft.specialIslandLeft },
        transform: 'translate(-50%, -50%)',
        size: draft.specialIslandSize,
      },
    ]);
  });

  it('returns an empty array for the crest row (no draggable sprite)', () => {
    const row = findRow('crest');
    expect(toSlotsForRow(row, toIslandTileSlotsDraft())).toEqual([]);
  });

  it('reads live edits from the draft, not the static constants', () => {
    const row = findRow('special-art');
    const draft = toIslandTileSlotsDraft();
    draft.specialIslandTop = '12%';
    draft.specialIslandSize = 50;

    const slots = toSlotsForRow(row, draft);

    expect(slots[0].style.top).toBe('12%');
    expect(slots[0].size).toBe(50);
  });
});
