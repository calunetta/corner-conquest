// Moves an uploaded monster to a new level and/or Boss flag: its sprite file names encode both,
// so the GIFs are copied to the new names and the old ones removed.
import { readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import {
  buildMonsterCatalogEntries,
  buildMonsterSpriteFilename,
  findMonsterEntry,
  MONSTER_SPRITE_PUBLIC_DIRECTORY_FS,
  SEED_MONSTER_CATALOG,
  toCatalogEntryKey,
} from '@/modules/game-rules/monster-catalog-generator';
import type { MonsterCatalogEntry } from '@/modules/game-rules/monster-catalog.types';
import { listGifFilenames, toProjectPath, writeCatalogSources } from './catalog-files';
import type { MonsterEditRequest } from './validation';

export interface MonsterEditFailure {
  message: string;
  status: 403 | 404 | 409;
}

export type MonsterEditResult = { entry: MonsterCatalogEntry } | MonsterEditFailure;

type SpriteKind = 'idle' | 'attack';
interface SpriteMove {
  from: string;
  to: string;
}

const SPRITE_KINDS: SpriteKind[] = ['idle', 'attack'];

const failure = (message: string, status: MonsterEditFailure['status']): MonsterEditFailure => ({ message, status });

function isSeedEntry(entry: MonsterCatalogEntry): boolean {
  const key = toCatalogEntryKey(entry.name, entry.level);
  return SEED_MONSTER_CATALOG.some((seed) => toCatalogEntryKey(seed.name, seed.level) === key);
}

function planSpriteMoves(entry: MonsterCatalogEntry, nextLevel: number, nextIsBoss: boolean): SpriteMove[] {
  return SPRITE_KINDS.flatMap((kind) => {
    const currentSprite = entry.sprite[kind];
    if (!currentSprite) return [];
    return [
      {
        from: path.basename(currentSprite),
        to: buildMonsterSpriteFilename(entry.name, nextLevel, nextIsBoss, kind),
      },
    ];
  });
}

export async function moveMonsterSprites(edit: MonsterEditRequest): Promise<MonsterEditResult> {
  const currentFilenames = await listGifFilenames();
  const currentEntries = buildMonsterCatalogEntries(currentFilenames);
  const entry = findMonsterEntry(currentEntries, edit.name, edit.level);
  if (!entry) return failure(`No monster named "${edit.name}" at level ${edit.level}.`, 404);
  if (isSeedEntry(entry)) return failure(`${entry.name} is a seed monster and can't be changed here.`, 403);
  if (edit.nextLevel === entry.level && edit.nextIsBoss === entry.isBoss) return { entry };

  const otherEntries = currentEntries.filter((other) => other !== entry);
  if (findMonsterEntry(otherEntries, entry.name, edit.nextLevel)) {
    return failure(`A monster named "${entry.name}" at level ${edit.nextLevel} already exists.`, 409);
  }

  const moves = planSpriteMoves(entry, edit.nextLevel, edit.nextIsBoss);
  const spriteDirectory = toProjectPath(MONSTER_SPRITE_PUBLIC_DIRECTORY_FS);
  // Copy before anything is removed, so a failure partway leaves the original sprites in place.
  for (const move of moves) {
    await writeFile(path.join(spriteDirectory, move.to), await readFile(path.join(spriteDirectory, move.from)));
  }

  const movedFrom = new Set(moves.map((move) => move.from));
  const nextFilenames = [...currentFilenames.filter((filename) => !movedFrom.has(filename)), ...moves.map((move) => move.to)];
  const nextEntries = buildMonsterCatalogEntries(nextFilenames.sort());
  await writeCatalogSources(nextEntries);

  for (const move of moves) {
    await unlink(path.join(spriteDirectory, move.from));
  }
  return { entry: findMonsterEntry(nextEntries, entry.name, edit.nextLevel) as MonsterCatalogEntry };
}

export interface MonsterRemoval {
  name: string;
  level: number;
}

/** Deletes an uploaded monster's sprite file(s) and regenerates both catalog sources. Seeds are fixed. */
export async function removeMonsterSprites(removal: MonsterRemoval): Promise<MonsterEditFailure | { removed: true }> {
  const currentFilenames = await listGifFilenames();
  const currentEntries = buildMonsterCatalogEntries(currentFilenames);
  const entry = findMonsterEntry(currentEntries, removal.name, removal.level);
  if (!entry) return failure(`No monster named "${removal.name}" at level ${removal.level}.`, 404);
  if (isSeedEntry(entry)) return failure(`${entry.name} is a seed monster and can't be removed.`, 403);

  const spriteDirectory = toProjectPath(MONSTER_SPRITE_PUBLIC_DIRECTORY_FS);
  const removedFiles = new Set(SPRITE_KINDS.flatMap((kind) => (entry.sprite[kind] ? [path.basename(entry.sprite[kind])] : [])));
  const nextFilenames = currentFilenames.filter((filename) => !removedFiles.has(filename));
  await writeCatalogSources(buildMonsterCatalogEntries(nextFilenames));

  for (const filename of removedFiles) {
    await unlink(path.join(spriteDirectory, filename));
  }
  return { removed: true };
}
