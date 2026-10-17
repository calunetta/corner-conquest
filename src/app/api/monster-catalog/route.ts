import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { gitBlobSha, readDevToolBytes, saveDevToolFiles, type DevToolChange } from '@/lib/dev-tools/save-file';
import { NextResponse } from 'next/server';
import {
  buildMonsterCatalogEntries,
  buildMonsterSpriteFilename,
  findMonsterEntry,
  renderMonsterCatalogSource,
} from '@/modules/game-rules/monster-catalog-generator';
import type { MonsterCatalogEntry } from '@/modules/game-rules/monster-catalog.types';
import { catalogSourceChanges, readCatalogSnapshot, spritePath, type CatalogSnapshot } from './catalog-files';
import { planMonsterMove, planMonsterRemoval, type ChangedPlan, type SpriteRename } from './edit';
import { parseMonsterEditBody, parseMonsterKeyBody, parseMonsterUploadFields, validateSpriteBytes } from './validation';
import type { UploadFieldError } from './validation';

// Dev-only: every request needs the dev tools password (see src/lib/dev-tools/access.ts).

function errorResponse(message: string, status: number, field?: UploadFieldError['field']): Response {
  return NextResponse.json({ error: message, field }, { status });
}

function conflictResponse(newer: CatalogSnapshot): Response {
  return NextResponse.json(
    {
      error: 'The monster catalog changed since you loaded it. The newer list is loaded; re-apply your change.',
      entries: newer.entries,
      sha: newer.sha,
    },
    { status: 409 },
  );
}

function savedResponse(entry: MonsterCatalogEntry | undefined, nextEntries: MonsterCatalogEntry[], pullRequestUrl: string | null) {
  return NextResponse.json({
    entry,
    entries: nextEntries,
    sha: gitBlobSha(renderMonsterCatalogSource(nextEntries)),
    pullRequestUrl,
  });
}

async function readBytes(file: File | null): Promise<Uint8Array | null> {
  return file ? new Uint8Array(await file.arrayBuffer()) : null;
}

/** Changes that rename or remove sprite files. Bytes are read first so each delete carries the sha it read. */
async function spriteChanges(plan: ChangedPlan): Promise<DevToolChange[]> {
  const changes: DevToolChange[] = [];
  for (const rename of plan.renames as SpriteRename[]) {
    const bytes = await readDevToolBytes(spritePath(rename.from));
    changes.push({ path: spritePath(rename.to), content: bytes, baseSha: null });
    changes.push({ path: spritePath(rename.from), content: null, baseSha: gitBlobSha(bytes) });
  }
  for (const filename of plan.removals) {
    const bytes = await readDevToolBytes(spritePath(filename));
    changes.push({ path: spritePath(filename), content: null, baseSha: gitBlobSha(bytes) });
  }
  return changes;
}

/** Accepts multipart fields: `name`, `level`, `isBoss`, `idle` (GIF), optional `attack` (GIF) and `baseSha`. */
export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const form = await request.formData();
  const fields = parseMonsterUploadFields(form);
  if ('message' in fields) return errorResponse(fields.message, fields.status, fields.field);

  const idleBytes = await readBytes(fields.idle);
  const attackBytes = await readBytes(fields.attack);
  const byteError =
    (idleBytes && validateSpriteBytes(idleBytes, 'idle')) ||
    (attackBytes && validateSpriteBytes(attackBytes, 'attack'));
  if (byteError) return errorResponse(byteError.message, byteError.status, byteError.field);

  const snapshot = await readCatalogSnapshot();
  const baseSha = form.get('baseSha');
  if (typeof baseSha === 'string' && baseSha !== snapshot.sha) return conflictResponse(snapshot);

  if (findMonsterEntry(snapshot.entries, fields.name, fields.level)) {
    return errorResponse(`A monster named "${fields.name}" at level ${fields.level} already exists.`, 409, 'name');
  }

  const changes: DevToolChange[] = [];
  const writtenFilenames: string[] = [];
  for (const [kind, bytes] of [['idle', idleBytes], ['attack', attackBytes]] as const) {
    if (!bytes) continue;
    const filename = buildMonsterSpriteFilename(fields.name, fields.level, fields.isBoss, kind);
    changes.push({ path: spritePath(filename), content: bytes, baseSha: null });
    writtenFilenames.push(filename);
  }

  const nextEntries = buildMonsterCatalogEntries([...snapshot.filenames, ...writtenFilenames].sort());
  const result = await saveDevToolFiles({
    changes: [...changes, ...catalogSourceChanges(nextEntries, snapshot.sha)],
    message: `feat(monsters): add ${fields.name} level ${fields.level}`,
  });
  if (result.status === 'conflict') return conflictResponse(await readCatalogSnapshot());

  return savedResponse(
    findMonsterEntry(nextEntries, fields.name, fields.level),
    nextEntries,
    result.status === 'saved' && result.pullRequest.url ? result.pullRequest.url : null,
  );
}

/** Changes the level and/or Boss flag of one uploaded monster: renames its sprite file(s) and regenerates the
 *  sources, in one save. Seed monsters are rejected (they are code constants). */
export async function PATCH(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { baseSha?: unknown } | null;
  const edit = parseMonsterEditBody(body);
  if ('message' in edit) return errorResponse(edit.message, edit.status, edit.field);

  const snapshot = await readCatalogSnapshot();
  if (typeof body?.baseSha === 'string' && body.baseSha !== snapshot.sha) return conflictResponse(snapshot);

  const plan = planMonsterMove(edit, snapshot);
  if ('message' in plan) return errorResponse(plan.message, plan.status);
  if (plan.kind === 'unchanged') return savedResponse(plan.entry, snapshot.entries, null);

  const nextEntries = buildMonsterCatalogEntries(plan.nextFilenames);
  const result = await saveDevToolFiles({
    changes: [...(await spriteChanges(plan)), ...catalogSourceChanges(nextEntries, snapshot.sha)],
    message: `chore(monsters): update ${edit.name} to level ${edit.nextLevel}${edit.nextIsBoss ? ' (boss)' : ''}`,
  });
  if (result.status === 'conflict') return conflictResponse(await readCatalogSnapshot());

  return savedResponse(plan.entry, nextEntries, pullRequestUrlOf(result));
}

function pullRequestUrlOf(result: { status: string; pullRequest?: { url: string } }): string | null {
  return result.status === 'saved' && result.pullRequest?.url ? result.pullRequest.url : null;
}

/** Removes an uploaded monster's sprite file(s) and regenerates the sources. Seed monsters are rejected. */
export async function DELETE(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { baseSha?: unknown } | null;
  const key = parseMonsterKeyBody(body);
  if ('message' in key) return errorResponse(key.message, key.status, key.field);

  const snapshot = await readCatalogSnapshot();
  if (typeof body?.baseSha === 'string' && body.baseSha !== snapshot.sha) return conflictResponse(snapshot);

  const plan = planMonsterRemoval(key, snapshot);
  if ('message' in plan) return errorResponse(plan.message, plan.status);

  const result = await saveDevToolFiles({
    changes: [...(await spriteChanges(plan)), ...catalogSourceChanges(buildMonsterCatalogEntries(plan.nextFilenames), snapshot.sha)],
    message: `chore(monsters): remove ${key.name} level ${key.level}`,
  });
  if (result.status === 'conflict') return conflictResponse(await readCatalogSnapshot());

  return NextResponse.json({
    removed: true,
    entries: buildMonsterCatalogEntries(plan.nextFilenames),
    sha: gitBlobSha(renderMonsterCatalogSource(buildMonsterCatalogEntries(plan.nextFilenames))),
    pullRequestUrl: result.status === 'saved' && result.pullRequest.url ? result.pullRequest.url : null,
  });
}

/** GET: the catalog as the live copy has it, with the sha the next change must send back. */
export async function GET(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const snapshot = await readCatalogSnapshot();
  return NextResponse.json({ entries: snapshot.entries, sha: snapshot.sha });
}
