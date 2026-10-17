import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { isGitHubTarget } from '@/lib/dev-tools/save-file';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { ISLAND_TILE_SLOTS_PATH } from '@/modules/map/island-tile-slots.types';
import type { IslandTileSlotsDraft } from '@/modules/map/island-tile-slots.types';
import { regenerateIslandTileSlotsSource } from './regenerate-source';

// Dev-only: every request needs the dev-tools token (see src/lib/dev-tools/access.ts).

function isCornerPositionArray(value: unknown): value is IslandTileSlotsDraft['occupantCornerSlots'] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => typeof entry === 'object' && entry !== null && 'id' in entry && 'style' in entry)
  );
}

function isSlotDef(value: unknown): value is IslandTileSlotsDraft['singleResourceSlot'] {
  return typeof value === 'object' && value !== null && 'size' in value && typeof (value as { size: unknown }).size === 'number';
}

function isSlotDefArray(value: unknown): value is IslandTileSlotsDraft['dualResourceSlots'] {
  return Array.isArray(value) && value.every(isSlotDef);
}

function isCompleteIslandTileSlotsDraft(draft: unknown): draft is IslandTileSlotsDraft {
  if (typeof draft !== 'object' || draft === null) return false;
  const record = draft as Record<string, unknown>;

  return (
    isCornerPositionArray(record.occupantCornerSlots) &&
    isCornerPositionArray(record.boatCornerPositions) &&
    typeof record.occupantSize === 'number' &&
    typeof record.boatSize === 'number' &&
    typeof record.specialIslandTop === 'string' &&
    typeof record.specialIslandLeft === 'string' &&
    typeof record.specialIslandSize === 'number' &&
    typeof record.baseCrestSize === 'number' &&
    typeof record.baseCrestMinPx === 'number' &&
    isSlotDef(record.singleResourceSlot) &&
    isSlotDefArray(record.dualResourceSlots) &&
    isSlotDefArray(record.tripleResourceSlots) &&
    isSlotDefArray(record.quadResourceSlots) &&
    isSlotDefArray(record.baseResourceSlots)
  );
}

export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;
  if (isGitHubTarget()) {
    return NextResponse.json({ error: 'Default elements can only be saved on the local dev server for now.' }, { status: 501 });
  }

  const body = (await request.json()) as { draft?: unknown };

  if (!isCompleteIslandTileSlotsDraft(body.draft)) {
    return NextResponse.json({ error: 'The draft is missing a required field.' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), ISLAND_TILE_SLOTS_PATH);
  const currentSource = await readFile(filePath, 'utf-8');
  const nextSource = regenerateIslandTileSlotsSource(currentSource, body.draft);
  await writeFile(filePath, nextSource);

  return NextResponse.json({ ok: true });
}
