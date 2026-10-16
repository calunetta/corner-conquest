import fs from 'fs';
import path from 'path';
import {
  BASE_CREST_MIN_PX,
  BASE_CREST_SIZE,
  BASE_RESOURCE_SLOTS,
  BOAT_CORNER_POSITIONS,
  BOAT_SIZE,
  DUAL_RESOURCE_SLOTS,
  ISLAND_TILE_SLOTS_PATH,
  OCCUPANT_CORNER_SLOTS,
  OCCUPANT_SIZE,
  QUAD_RESOURCE_SLOTS,
  SINGLE_RESOURCE_SLOT,
  SPECIAL_ISLAND_LEFT,
  SPECIAL_ISLAND_SIZE,
  SPECIAL_ISLAND_TOP,
  TRIPLE_RESOURCE_SLOTS,
} from '@/modules/map/island-tile-slots.types';
import type { IslandTileSlotsDraft } from '@/modules/map/island-tile-slots.types';
import { regenerateIslandTileSlotsSource } from './regenerate-source';

const REAL_FILE_PATH = path.join(process.cwd(), ISLAND_TILE_SLOTS_PATH);

function deepCloneDraft(): IslandTileSlotsDraft {
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

describe('regenerateIslandTileSlotsSource', () => {
  // The mandatory safety net before Save can ever touch the user's locked, hand-tuned file:
  // regenerating with an unchanged draft must be byte-identical to what is on disk today.
  it('is byte-identical to the real file when the draft is unchanged (round trip)', () => {
    const currentSource = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
    const draft = deepCloneDraft();

    const output = regenerateIslandTileSlotsSource(currentSource, draft);

    expect(output).toBe(currentSource);
  });

  it('changes exactly the OCCUPANT_SIZE line when only that value changes', () => {
    const currentSource = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
    const draft = deepCloneDraft();
    draft.occupantSize = 99;

    const output = regenerateIslandTileSlotsSource(currentSource, draft);

    expect(output).not.toBe(currentSource);
    expect(output).toContain('export const OCCUPANT_SIZE = 99;');
    // Every other line is byte-identical: diff line-by-line and confirm only one line differs.
    const beforeLines = currentSource.split('\n');
    const afterLines = output.split('\n');
    const changedLines = beforeLines.filter((line, index) => line !== afterLines[index]);
    expect(changedLines).toEqual(['export const OCCUPANT_SIZE = 43; // knight box width/height, % of T']);
  });

  it('changes one corner\'s own key on OCCUPANT_CORNER_SLOTS without touching the other 3 corners or BOAT_CORNER_POSITIONS\'s identically-shaped entries', () => {
    const currentSource = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
    const draft = deepCloneDraft();
    const brIndex = draft.occupantCornerSlots.findIndex((corner) => corner.id === 'br');
    draft.occupantCornerSlots[brIndex] = { id: 'br', style: { bottom: '-9%', right: '-5%' } };

    const output = regenerateIslandTileSlotsSource(currentSource, draft);

    expect(output).toContain("{ id: 'br', style: { bottom: '-9%', right: '-5%' } },");
    // The other 3 OCCUPANT_CORNER_SLOTS lines, and every BOAT_CORNER_POSITIONS line, are unchanged.
    expect(output).toContain("{ id: 'tr', style: { top: '-20%', right: '-5%' } },");
    expect(output).toContain("{ id: 'tl', style: { top: '-20%', left: '-5%' } },");
    expect(output).toContain("{ id: 'bl', style: { bottom: '-1%', left: '-5%' } },");
    expect(output).toContain("{ id: 'br', style: { bottom: '0', right: '0' } },");
    expect(output).toContain("{ id: 'tr', style: { top: '0', right: '0' } },");
  });

  it('changes BASE_RESOURCE_SLOTS[1]\'s right value (including a negative one) without touching index 0 or 2', () => {
    const currentSource = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
    const draft = deepCloneDraft();
    draft.baseResourceSlots[1] = { ...draft.baseResourceSlots[1], right: '-18%' };

    const output = regenerateIslandTileSlotsSource(currentSource, draft);

    expect(output).toContain("{ top: '45%', right: '-18%', size: 30 },");
    expect(output).toContain("{ top: '60%', left: '20%', size: 30 },");
    expect(output).toContain("{ top: '15%', left: '50%', size: 30 },");
  });

  it('changes SPECIAL_ISLAND_TOP\'s quoted string value on its own line only', () => {
    const currentSource = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
    const draft = deepCloneDraft();
    draft.specialIslandTop = '12%';

    const output = regenerateIslandTileSlotsSource(currentSource, draft);

    expect(output).toContain("export const SPECIAL_ISLAND_TOP = '12%';");
    expect(output).toContain("export const SPECIAL_ISLAND_LEFT = '50%';"); // untouched sibling export
  });

  it('passes every comment, import and non-draft export through unchanged', () => {
    const currentSource = fs.readFileSync(REAL_FILE_PATH, 'utf-8');
    const draft = deepCloneDraft();
    draft.boatSize = 1;

    const output = regenerateIslandTileSlotsSource(currentSource, draft);

    // CORNER_TRANSFORMS is deliberately not part of IslandTileSlotsDraft: must pass through untouched.
    expect(output).toContain("br: 'translate(50%, 50%)',");
    expect(output).toContain("tr: 'translate(50%, -50%)',");
    // A representative block comment, verbatim.
    expect(output).toContain(
      '/** Knight (occupant) anchors, same order as BOAT_CORNER_POSITIONS. Each knight is offset 24%',
    );
  });
});
