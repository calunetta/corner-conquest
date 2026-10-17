// Shared by the monster catalog routes. The catalog is derived from the sprite file names in public/monster,
// so a save is the sprite files plus the two generated sources, committed together.
import { listDevToolDirectory, readDevToolFile, type DevToolChange } from '@/lib/dev-tools/save-file';
import {
  buildMonsterCatalogEntries,
  MONSTER_CATALOG_GENERATED_PATH,
  MONSTER_NAMES_GENERATED_PATH,
  MONSTER_SPRITE_PUBLIC_DIRECTORY_FS,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from '@/modules/game-rules/monster-catalog-generator';
import type { MonsterCatalogEntry } from '@/modules/game-rules/monster-catalog.types';

/** The sprite folder's GIF names, sorted. A missing folder is valid: the seed entries still make a catalog. */
export async function listGifFilenames(): Promise<string[]> {
  const names = await listDevToolDirectory(MONSTER_SPRITE_PUBLIC_DIRECTORY_FS);
  return names.filter((filename) => filename.toLowerCase().endsWith('.gif')).sort();
}

export const spritePath = (filename: string): string => `${MONSTER_SPRITE_PUBLIC_DIRECTORY_FS}/${filename}`;

export interface CatalogSnapshot {
  filenames: string[];
  entries: MonsterCatalogEntry[];
  /** Blob sha of the generated catalog source; the editor sends it back so a stale change is refused. */
  sha: string;
}

export async function readCatalogSnapshot(): Promise<CatalogSnapshot> {
  const [filenames, source] = await Promise.all([listGifFilenames(), readDevToolFile(MONSTER_CATALOG_GENERATED_PATH)]);
  return { filenames, entries: buildMonsterCatalogEntries(filenames), sha: source.sha };
}

/** The two generated sources for a catalog. Only the catalog file carries the conflict check. */
export function catalogSourceChanges(entries: MonsterCatalogEntry[], baseSha: string): DevToolChange[] {
  return [
    { path: MONSTER_CATALOG_GENERATED_PATH, content: renderMonsterCatalogSource(entries), baseSha },
    { path: MONSTER_NAMES_GENERATED_PATH, content: renderMonsterNameSource(entries.map((entry) => entry.name)) },
  ];
}
