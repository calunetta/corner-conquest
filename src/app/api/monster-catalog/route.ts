import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import {
  buildMonsterCatalogEntries,
  buildMonsterSpriteFilename,
  findMonsterEntry,
  MONSTER_SPRITE_PUBLIC_DIRECTORY_FS,
} from '@/modules/game-rules/monster-catalog-generator';
import { listGifFilenames, toProjectPath, writeCatalogSources } from './catalog-files';
import { moveMonsterSprites } from './edit';
import { parseMonsterEditBody, parseMonsterUploadFields, validateSpriteBytes } from './validation';
import type { UploadFieldError } from './validation';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem writes), same as the other testbed editor routes.

function errorResponse(message: string, status: number, field?: UploadFieldError['field']): Response {
  return NextResponse.json({ error: message, field }, { status });
}

async function readBytes(file: File | null): Promise<Uint8Array | null> {
  return file ? new Uint8Array(await file.arrayBuffer()) : null;
}

/** Accepts multipart fields: `name`, `level`, `isBoss`, `idle` (GIF) and optional `attack` (GIF).
 *  Writes the sprite file(s), then regenerates both generated source files from a fresh scan. */
export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const fields = parseMonsterUploadFields(await request.formData());
  if ('message' in fields) return errorResponse(fields.message, fields.status, fields.field);

  const idleBytes = await readBytes(fields.idle);
  const attackBytes = await readBytes(fields.attack);
  const byteError =
    (idleBytes && validateSpriteBytes(idleBytes, 'idle')) ||
    (attackBytes && validateSpriteBytes(attackBytes, 'attack'));
  if (byteError) return errorResponse(byteError.message, byteError.status, byteError.field);

  const currentFilenames = await listGifFilenames();
  if (findMonsterEntry(buildMonsterCatalogEntries(currentFilenames), fields.name, fields.level)) {
    return errorResponse(`A monster named "${fields.name}" at level ${fields.level} already exists.`, 409, 'name');
  }

  const spriteDirectory = toProjectPath(MONSTER_SPRITE_PUBLIC_DIRECTORY_FS);
  const writtenFilenames: string[] = [];
  const spriteWrites: Array<[kind: 'idle' | 'attack', bytes: Uint8Array | null]> = [
    ['idle', idleBytes],
    ['attack', attackBytes],
  ];
  await mkdir(spriteDirectory, { recursive: true });
  for (const [kind, bytes] of spriteWrites) {
    if (!bytes) continue;
    const filename = buildMonsterSpriteFilename(fields.name, fields.level, fields.isBoss, kind);
    await writeFile(path.join(spriteDirectory, filename), bytes);
    writtenFilenames.push(filename);
  }

  const nextEntries = buildMonsterCatalogEntries([...currentFilenames, ...writtenFilenames].sort());
  await writeCatalogSources(nextEntries);

  return NextResponse.json({ entry: findMonsterEntry(nextEntries, fields.name, fields.level) });
}

/** Changes the level and/or Boss flag of one uploaded monster: moves its sprite file(s) to the new
 *  name and regenerates both sources. Seed monsters are rejected (they are code constants). */
export async function PATCH(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const edit = parseMonsterEditBody(await request.json().catch(() => null));
  if ('message' in edit) return errorResponse(edit.message, edit.status, edit.field);

  const result = await moveMonsterSprites(edit);
  if ('message' in result) return errorResponse(result.message, result.status);
  return NextResponse.json({ entry: result.entry });
}
