// Filesystem helpers shared by the monster catalog routes. Kept apart from route.ts so the
// POST and PATCH handlers read the same sprite folder and write the same generated sources.
import { readdir, writeFile } from 'fs/promises';
import path from 'path';
import {
  MONSTER_CATALOG_GENERATED_PATH,
  MONSTER_NAMES_GENERATED_PATH,
  MONSTER_SPRITE_PUBLIC_DIRECTORY_FS,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from '@/modules/game-rules/monster-catalog-generator';
import type { MonsterCatalogEntry } from '@/modules/game-rules/monster-catalog.types';

export const toProjectPath = (relativePath: string): string => path.join(process.cwd(), relativePath);

export async function listGifFilenames(): Promise<string[]> {
  try {
    const filenames = await readdir(toProjectPath(MONSTER_SPRITE_PUBLIC_DIRECTORY_FS));
    return filenames.filter((filename) => filename.toLowerCase().endsWith('.gif')).sort();
  } catch {
    // A missing folder is valid: the seed entries still make a complete catalog.
    return [];
  }
}

/** Rewrites both generated sources from the entries the current sprite folder produces. */
export async function writeCatalogSources(entries: MonsterCatalogEntry[]): Promise<void> {
  await writeFile(toProjectPath(MONSTER_CATALOG_GENERATED_PATH), renderMonsterCatalogSource(entries));
  await writeFile(
    toProjectPath(MONSTER_NAMES_GENERATED_PATH),
    renderMonsterNameSource(entries.map((entry) => entry.name)),
  );
}
