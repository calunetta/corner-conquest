import { BASE_RESOURCE_SLOTS, OCCUPANT_CORNER_SLOTS } from '@/modules/map';
import {
  ANCHORED_OFFSET_MAX,
  ANCHORED_OFFSET_MIN,
  applyCrestFieldToDraft,
  applyDragToDraft,
  applyNudgeToDraft,
  applySharedCornerSizeToDraft,
  applySlotSizeToDraft,
  clampAnchoredOffsetPercent,
  nudgeAnchoredStyle,
  toAnchoredStyleFromPointer,
  toAnchoredStyleReadout,
} from './TileDecorationEditor.defaultElements.edit.map';
import { toIslandTileSlotsDraft } from './TileDecorationEditor.defaultElements.map';
import { DEFAULT_ELEMENT_ROWS } from './TileDecorationEditor.defaultElements.map';
import type { DefaultElementRowMeta } from './TileDecorationEditor.defaultElements.types';

const identityClamp = (value: number): number => value;

function findRow(id: DefaultElementRowMeta['id']): DefaultElementRowMeta {
  const row = DEFAULT_ELEMENT_ROWS.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`No DEFAULT_ELEMENT_ROWS entry for ${id}`);
  return row;
}

describe('clampAnchoredOffsetPercent', () => {
  it.each([
    [-60, -50],
    [-50, -50],
    [-20, -20],
    // The mandated regression case: BASE_RESOURCE_SLOTS[1].right is -17, inside [-50,100], so the
    // clamp must be a no-op — this is the value a [0,100] clamp would have corrupted.
    [-17, -17],
    [0, 0],
    [50, 50],
    [100, 100],
    [150, 100],
  ])('clamps %d to %d', (input, expected) => {
    expect(clampAnchoredOffsetPercent(input)).toBe(expected);
  });

  it('exposes its bounds as ANCHORED_OFFSET_MIN/MAX', () => {
    expect(ANCHORED_OFFSET_MIN).toBe(-50);
    expect(ANCHORED_OFFSET_MAX).toBe(100);
  });
});

describe('toAnchoredStyleFromPointer', () => {
  it.each([
    [{ bottom: '0%', right: '0%' }, 30, 40, { bottom: '70%', right: '60%' }],
    [{ top: '0%', right: '0%' }, 30, 40, { top: '30%', right: '60%' }],
    [{ top: '0%', left: '0%' }, 30, 40, { top: '30%', left: '40%' }],
    [{ bottom: '0%', left: '0%' }, 30, 40, { bottom: '70%', left: '40%' }],
  ])('derives the next style for key pair %o from pointer (%d, %d)', (previousStyle, pointerTop, pointerLeft, expected) => {
    expect(toAnchoredStyleFromPointer(previousStyle, pointerTop, pointerLeft, identityClamp)).toEqual(expected);
  });

  it('derives a {top,left} resource-slot style the same way', () => {
    expect(toAnchoredStyleFromPointer({ top: '0%', left: '0%' }, 45, 50, identityClamp)).toEqual({
      top: '45%',
      left: '50%',
    });
  });

  it('only touches keys present on the previous style', () => {
    expect(toAnchoredStyleFromPointer({ top: '0%' }, 45, 50, identityClamp)).toEqual({ top: '45%' });
  });

  it('clamps every derived value through the supplied clamp function', () => {
    const clampToZero = (): number => 0;
    expect(toAnchoredStyleFromPointer({ top: '0%', left: '0%' }, 999, -999, clampToZero)).toEqual({
      top: '0%',
      left: '0%',
    });
  });
});

describe('nudgeAnchoredStyle', () => {
  it.each([
    [{ bottom: '10%', right: '20%' }, 1, -1, { bottom: '9%', right: '21%' }],
    [{ top: '10%', right: '20%' }, 1, -1, { top: '11%', right: '21%' }],
    [{ top: '10%', left: '20%' }, 1, -1, { top: '11%', left: '19%' }],
    [{ bottom: '10%', left: '20%' }, 1, -1, { bottom: '9%', left: '19%' }],
  ])('nudges key pair %o by (dTop=%d, dLeft=%d)', (previousStyle, dTop, dLeft, expected) => {
    expect(nudgeAnchoredStyle(previousStyle, dTop, dLeft, identityClamp)).toEqual(expected);
  });

  it('only touches keys present on the previous style', () => {
    expect(nudgeAnchoredStyle({ left: '20%' }, 1, 5, identityClamp)).toEqual({ left: '25%' });
  });

  // Required case (architect-b): one ArrowRight nudge (dLeft=1) on the real locked
  // BASE_RESOURCE_SLOTS[1] = { top: '45%', right: '-17%', size: 30 } must move right from -17 to
  // -18, not snap to 0 — proving the shared [-50,100] clamp never corrupts this real negative value.
  it('moves BASE_RESOURCE_SLOTS[1].right from -17% to -18% on one ArrowRight nudge, never snapping to 0%', () => {
    const slot = BASE_RESOURCE_SLOTS[1];
    expect(slot).toEqual({ top: '45%', right: '-17%', size: 30 });

    const previousStyle = { top: slot.top, right: slot.right };
    const next = nudgeAnchoredStyle(previousStyle, 0, 1, clampAnchoredOffsetPercent);

    expect(next.right).toBe('-18%');
    expect(next.right).not.toBe('0%');
  });
});

describe('toAnchoredStyleReadout', () => {
  it('formats a single key capitalized', () => {
    expect(toAnchoredStyleReadout({ top: '50%' })).toBe('Top 50%');
  });

  it('returns an empty string for an empty style', () => {
    expect(toAnchoredStyleReadout({})).toBe('');
  });

  // BUG (reported, not fixed here — Don't change production code): the Contracts block
  // (plan.md, TileDecorationEditor.defaultElements.edit.map.ts's own doc comment above
  // toAnchoredStyleReadout) documents only the FIRST key as capitalized, e.g.
  // "Bottom -1%, right -5%" / "Top 50%, left 50%". The implementation capitalizes every key
  // (`.map((key) => \`${key.charAt(0).toUpperCase()}...\`)` runs per key, not just the first),
  // producing "Bottom -1%, Right -5%" / "Top 50%, Left 50%" instead. This test pins the
  // documented/intended output and is expected to fail until implementer-a fixes the map
  // (lowercase every key after the first) or the doc comment is corrected to match.
  it.each([
    [{ bottom: '-1%', right: '-5%' }, 'Bottom -1%, right -5%'],
    [{ top: '50%', left: '50%' }, 'Top 50%, left 50%'],
  ])('formats %o as %s (only the first key capitalized, per the Contract)', (style, expected) => {
    expect(toAnchoredStyleReadout(style)).toBe(expected);
  });
});

describe('applyDragToDraft', () => {
  it('drags one knight corner without moving the other 3', () => {
    const row = findRow('knight');
    const draft = toIslandTileSlotsDraft();
    const before = draft.occupantCornerSlots.map((corner) => ({ ...corner, style: { ...corner.style } }));

    const next = applyDragToDraft(row, 'br', 10, 90, draft);

    expect(next.occupantCornerSlots.find((corner) => corner.id === 'br')?.style).not.toEqual(
      before.find((corner) => corner.id === 'br')?.style,
    );
    (['tr', 'tl', 'bl'] as const).forEach((id) => {
      expect(next.occupantCornerSlots.find((corner) => corner.id === id)?.style).toEqual(
        before.find((corner) => corner.id === id)?.style,
      );
    });
  });

  it('never mutates the input draft', () => {
    const row = findRow('knight');
    const draft = toIslandTileSlotsDraft();
    const originalStyle = { ...draft.occupantCornerSlots[0].style };

    applyDragToDraft(row, 'br', 10, 90, draft);

    expect(draft.occupantCornerSlots[0].style).toEqual(originalStyle);
  });

  it('edits only the matching index in a resourceSlots row, leaving the others untouched', () => {
    const row = findRow('base-resources');
    const draft = toIslandTileSlotsDraft();
    const before = draft.baseResourceSlots.map((slot) => ({ ...slot }));

    const next = applyDragToDraft(row, 'node-1', 0, 83, draft);

    expect(next.baseResourceSlots[1]).not.toEqual(before[1]);
    expect(next.baseResourceSlots[0]).toEqual(before[0]);
    expect(next.baseResourceSlots[2]).toEqual(before[2]);
  });

  it('edits the specialArt row\'s single center point', () => {
    const row = findRow('special-art');
    const draft = toIslandTileSlotsDraft();

    const next = applyDragToDraft(row, 'special', 12, 88, draft);

    expect(next.specialIslandTop).toBe('12%');
    expect(next.specialIslandLeft).toBe('88%');
  });

  it('is a no-op for the crest row (no anchored edits)', () => {
    const row = findRow('crest');
    const draft = toIslandTileSlotsDraft();

    const next = applyDragToDraft(row, 'anything', 10, 10, draft);

    expect(next).toEqual(draft);
  });
});

describe('applyNudgeToDraft', () => {
  it('nudges one boat corner without moving the other 3', () => {
    const row = findRow('boat');
    const draft = toIslandTileSlotsDraft();
    const before = draft.boatCornerPositions.map((corner) => ({ ...corner, style: { ...corner.style } }));

    const next = applyNudgeToDraft(row, 'tl', 1, 1, draft);

    expect(next.boatCornerPositions.find((corner) => corner.id === 'tl')?.style).not.toEqual(
      before.find((corner) => corner.id === 'tl')?.style,
    );
    (['br', 'tr', 'bl'] as const).forEach((id) => {
      expect(next.boatCornerPositions.find((corner) => corner.id === id)?.style).toEqual(
        before.find((corner) => corner.id === id)?.style,
      );
    });
  });

  it('never mutates the input draft', () => {
    const row = findRow('boat');
    const draft = toIslandTileSlotsDraft();
    const originalStyle = { ...draft.boatCornerPositions[0].style };

    applyNudgeToDraft(row, 'br', 1, 1, draft);

    expect(draft.boatCornerPositions[0].style).toEqual(originalStyle);
  });
});

describe('applySharedCornerSizeToDraft', () => {
  it('resizes occupantSize for the knight row', () => {
    const draft = toIslandTileSlotsDraft();
    const next = applySharedCornerSizeToDraft('knight', 55, draft);
    expect(next.occupantSize).toBe(55);
    expect(next.boatSize).toBe(draft.boatSize);
  });

  it('resizes boatSize for the boat row', () => {
    const draft = toIslandTileSlotsDraft();
    const next = applySharedCornerSizeToDraft('boat', 60, draft);
    expect(next.boatSize).toBe(60);
    expect(next.occupantSize).toBe(draft.occupantSize);
  });

  it('never mutates the input draft', () => {
    const draft = toIslandTileSlotsDraft();
    const originalSize = draft.occupantSize;
    applySharedCornerSizeToDraft('knight', 55, draft);
    expect(draft.occupantSize).toBe(originalSize);
  });
});

describe('applySlotSizeToDraft', () => {
  it('resizes only the matching resource slot by index', () => {
    const row = findRow('base-resources');
    const draft = toIslandTileSlotsDraft();

    const next = applySlotSizeToDraft(row, 'node-2', 77, draft);

    expect(next.baseResourceSlots[2].size).toBe(77);
    expect(next.baseResourceSlots[0].size).toBe(draft.baseResourceSlots[0].size);
    expect(next.baseResourceSlots[1].size).toBe(draft.baseResourceSlots[1].size);
  });

  it('resizes the specialArt row\'s single size', () => {
    const row = findRow('special-art');
    const draft = toIslandTileSlotsDraft();
    const next = applySlotSizeToDraft(row, 'special', 42, draft);
    expect(next.specialIslandSize).toBe(42);
  });

  it('is a no-op for a corner row (resized via applySharedCornerSizeToDraft instead)', () => {
    const row = findRow('knight');
    const draft = toIslandTileSlotsDraft();
    const next = applySlotSizeToDraft(row, 'br', 99, draft);
    expect(next).toEqual(draft);
  });

  it('never mutates the input draft', () => {
    const row = findRow('base-resources');
    const draft = toIslandTileSlotsDraft();
    const originalSize = draft.baseResourceSlots[0].size;

    applySlotSizeToDraft(row, 'node-0', 1, draft);

    expect(draft.baseResourceSlots[0].size).toBe(originalSize);
  });
});

describe('applyCrestFieldToDraft', () => {
  it('sets baseCrestSize for field "size"', () => {
    const draft = toIslandTileSlotsDraft();
    const next = applyCrestFieldToDraft('size', 50, draft);
    expect(next.baseCrestSize).toBe(50);
    expect(next.baseCrestMinPx).toBe(draft.baseCrestMinPx);
  });

  it('sets baseCrestMinPx for field "minPx"', () => {
    const draft = toIslandTileSlotsDraft();
    const next = applyCrestFieldToDraft('minPx', 22, draft);
    expect(next.baseCrestMinPx).toBe(22);
    expect(next.baseCrestSize).toBe(draft.baseCrestSize);
  });

  it('never mutates the input draft', () => {
    const draft = toIslandTileSlotsDraft();
    const originalSize = draft.baseCrestSize;
    applyCrestFieldToDraft('size', 50, draft);
    expect(draft.baseCrestSize).toBe(originalSize);
  });
});

describe('real-data sanity (OCCUPANT_CORNER_SLOTS still has a negative, non -17, locked value)', () => {
  it('pins the minimum real occupant offset used to justify the shared clamp range', () => {
    expect(OCCUPANT_CORNER_SLOTS.find((corner) => corner.id === 'tr')?.style.top).toBe('-20%');
  });
});
