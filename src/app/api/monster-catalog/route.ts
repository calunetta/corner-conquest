import { mkdir, readdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import {
  buildMonsterCatalogEntries,
  buildMonsterSpriteFilename,
  findMonsterEntry,
  MONSTER_CATALOG_GENERATED_PATH,
  MONSTER_NAMES_GENERATED_PATH,
  MONSTER_SPRITE_PUBLIC_DIRECTORY_FS,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from '@/modules/game-rules/monster-catalog-generator';
import { parseMonsterUploadFields, validateSpriteBytes } from './validation';
import type { UploadFieldError } from './validation';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem writes), same as the other testbed editor routes.

const toProjectPath = (relativePath: string): string => path.join(process.cwd(), relativePath);

function errorResponse(message: string, status: number, field?: UploadFieldError['field']): Response {
  return NextResponse.json({ error: message, field }, { status });
}

async function listGifFilenames(): Promise<string[]> {
  try {
    const filenames = await readdir(toProjectPath(MONSTER_SPRITE_PUBLIC_DIRECTORY_FS));
    return filenames.filter((filename) => filename.toLowerCase().endsWith('.gif')).sort();
  } catch {
    // A missing folder is valid: the seed entries still make a complete catalog.
    return [];
  }
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
  await writeFile(toProjectPath(MONSTER_CATALOG_GENERATED_PATH), renderMonsterCatalogSource(nextEntries));
  await writeFile(
    toProjectPath(MONSTER_NAMES_GENERATED_PATH),
    renderMonsterNameSource(nextEntries.map((entry) => entry.name)),
  );

  return NextResponse.json({ entry: findMonsterEntry(nextEntries, fields.name, fields.level) });
}
