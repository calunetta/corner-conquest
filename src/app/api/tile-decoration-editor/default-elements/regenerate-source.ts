import type { CornerPosition, IslandTileSlotsDraft, SlotDef } from '@/modules/map/island-tile-slots.types';

/** Replaces, inside `{ id: '<id>', style: { ... } }` entries matching each corner in `corners`,
 *  only the value of whichever of top/bottom/left/right is already present on that corner's
 *  style — key order and every other character (including comments outside the array) untouched. */
function replaceCornerArray(source: string, exportName: string, corners: CornerPosition[]): string {
  const arrayRegex = new RegExp(`(export const ${exportName}:[^=]*=\\s*\\[)([\\s\\S]*?)(\\n\\];)`);
  return source.replace(arrayRegex, (_match, prefix: string, body: string, suffix: string) => {
    const entryRegex = /\{\s*id:\s*'(\w+)',\s*style:\s*\{([^}]*)\}\s*\}/g;
    const nextBody = body.replace(entryRegex, (entryMatch: string, id: string, styleBody: string) => {
      const corner = corners.find((candidate) => candidate.id === id);
      if (!corner) return entryMatch;
      const nextStyleBody = replaceAnchoredKeys(styleBody, corner.style);
      return entryMatch.replace(styleBody, () => nextStyleBody);
    });
    return `${prefix}${nextBody}${suffix}`;
  });
}

/** Replaces, inside each `{ ... }` entry of a SlotDef[] array (by index, not id), only the keys
 *  already present on the matching draft slot (top/bottom/left/right/size). */
function replaceSlotDefArray(source: string, exportName: string, slots: SlotDef[]): string {
  const arrayRegex = new RegExp(`(export const ${exportName}:[^=]*=\\s*\\[)([\\s\\S]*?)(\\n\\];)`);
  return source.replace(arrayRegex, (_match, prefix: string, body: string, suffix: string) => {
    let index = 0;
    const nextBody = body.replace(/\{[^{}]*\}/g, (entryMatch: string) => {
      const slot = slots[index];
      index += 1;
      return slot ? replaceSlotDefEntry(entryMatch, slot) : entryMatch;
    });
    return `${prefix}${nextBody}${suffix}`;
  });
}

/** Same scoped substitution as replaceSlotDefArray, for the one non-array SlotDef export. */
function replaceSlotDefObject(source: string, exportName: string, slot: SlotDef): string {
  const objectRegex = new RegExp(`(export const ${exportName}:[^=]*=\\s*)(\\{[^}]*\\})(;)`);
  return source.replace(
    objectRegex,
    (_match, prefix: string, body: string, suffix: string) => `${prefix}${replaceSlotDefEntry(body, slot)}${suffix}`,
  );
}

function replaceAnchoredKeys(text: string, style: CornerPosition['style']): string {
  let next = text;
  (['top', 'bottom', 'left', 'right'] as const).forEach((key) => {
    const value = style[key];
    if (value === undefined) return;
    const keyRegex = new RegExp(`(${key}:\\s*')[^']*(')`);
    next = next.replace(keyRegex, (_match, before: string, after: string) => `${before}${value}${after}`);
  });
  return next;
}

function replaceSlotDefEntry(entryText: string, slot: SlotDef): string {
  let next = replaceAnchoredKeys(entryText, slot);
  const sizeRegex = /(size:\s*)-?\d+(?:\.\d+)?/;
  next = next.replace(sizeRegex, (_match, before: string) => `${before}${slot.size}`);
  return next;
}

/** Replaces the number between `= ` and `;` on exportName's own line only. */
function replaceNumberExport(source: string, exportName: string, value: number): string {
  const regex = new RegExp(`(export const ${exportName}\\s*=\\s*)-?\\d+(?:\\.\\d+)?(\\s*;)`);
  return source.replace(regex, (_match, prefix: string, suffix: string) => `${prefix}${value}${suffix}`);
}

/** Replaces the quoted string between `= '` and `';` on exportName's own line only. */
function replaceStringExport(source: string, exportName: string, value: string): string {
  const regex = new RegExp(`(export const ${exportName}\\s*=\\s*')[^']*('\\s*;)`);
  return source.replace(regex, (_match, prefix: string, suffix: string) => `${prefix}${value}${suffix}`);
}

/** Regenerates island-tile-slots.types.ts's source text with the draft's edited values written
 *  back in, preserving every existing comment and every untouched export byte-for-byte. Only the
 *  literal values listed on IslandTileSlotsDraft are ever substituted; CORNER_TRANSFORMS and every
 *  other export pass through unchanged. */
export function regenerateIslandTileSlotsSource(currentSource: string, draft: IslandTileSlotsDraft): string {
  let next = currentSource;
  next = replaceCornerArray(next, 'OCCUPANT_CORNER_SLOTS', draft.occupantCornerSlots);
  next = replaceCornerArray(next, 'BOAT_CORNER_POSITIONS', draft.boatCornerPositions);
  next = replaceSlotDefObject(next, 'SINGLE_RESOURCE_SLOT', draft.singleResourceSlot);
  next = replaceSlotDefArray(next, 'DUAL_RESOURCE_SLOTS', draft.dualResourceSlots);
  next = replaceSlotDefArray(next, 'TRIPLE_RESOURCE_SLOTS', draft.tripleResourceSlots);
  next = replaceSlotDefArray(next, 'QUAD_RESOURCE_SLOTS', draft.quadResourceSlots);
  next = replaceSlotDefArray(next, 'BASE_RESOURCE_SLOTS', draft.baseResourceSlots);
  next = replaceNumberExport(next, 'OCCUPANT_SIZE', draft.occupantSize);
  next = replaceNumberExport(next, 'BOAT_SIZE', draft.boatSize);
  next = replaceNumberExport(next, 'SPECIAL_ISLAND_SIZE', draft.specialIslandSize);
  next = replaceNumberExport(next, 'BASE_CREST_SIZE', draft.baseCrestSize);
  next = replaceNumberExport(next, 'BASE_CREST_MIN_PX', draft.baseCrestMinPx);
  next = replaceStringExport(next, 'SPECIAL_ISLAND_TOP', draft.specialIslandTop);
  next = replaceStringExport(next, 'SPECIAL_ISLAND_LEFT', draft.specialIslandLeft);
  return next;
}
