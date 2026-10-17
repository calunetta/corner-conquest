// Plans a change to one uploaded monster. Its sprite file names encode level and Boss flag, so a change is
// a set of sprite renames or removals plus the regenerated sources. Nothing is written here.
import path from 'path';
import {
  buildMonsterCatalogEntries,
  buildMonsterSpriteFilename,
  findMonsterEntry,
  SEED_MONSTER_CATALOG,
  toCatalogEntryKey,
} from '@/modules/game-rules/monster-catalog-generator';
import type { MonsterCatalogEntry } from '@/modules/game-rules/monster-catalog.types';
import type { CatalogSnapshot } from './catalog-files';
import type { MonsterEditRequest } from './validation';

export interface PlanFailure {
  message: string;
  status: 403 | 404 | 409;
}

export interface SpriteRename {
  from: string;
  to: string;
}

export interface ChangedPlan {
  kind: 'changed';
  entry: MonsterCatalogEntry;
  renames: SpriteRename[];
  removals: string[];
  nextFilenames: string[];
}

export type MonsterPlan = PlanFailure | { kind: 'unchanged'; entry: MonsterCatalogEntry } | ChangedPlan;

type SpriteKind = 'idle' | 'attack';
const SPRITE_KINDS: SpriteKind[] = ['idle', 'attack'];

const failure = (message: string, status: PlanFailure['status']): PlanFailure => ({ message, status });

function isSeedEntry(entry: MonsterCatalogEntry): boolean {
  const key = toCatalogEntryKey(entry.name, entry.level);
  return SEED_MONSTER_CATALOG.some((seed) => toCatalogEntryKey(seed.name, seed.level) === key);
}

function spriteFilesOf(entry: MonsterCatalogEntry): string[] {
  return SPRITE_KINDS.flatMap((kind) => (entry.sprite[kind] ? [path.basename(entry.sprite[kind])] : []));
}

export function planMonsterMove(edit: MonsterEditRequest, snapshot: CatalogSnapshot): MonsterPlan {
  const entry = findMonsterEntry(snapshot.entries, edit.name, edit.level);
  if (!entry) return failure(`No monster named "${edit.name}" at level ${edit.level}.`, 404);
  if (isSeedEntry(entry)) return failure(`${entry.name} is a seed monster and can't be changed here.`, 403);
  if (edit.nextLevel === entry.level && edit.nextIsBoss === entry.isBoss) return { kind: 'unchanged', entry };

  const otherEntries = snapshot.entries.filter((other) => other !== entry);
  if (findMonsterEntry(otherEntries, entry.name, edit.nextLevel)) {
    return failure(`A monster named "${entry.name}" at level ${edit.nextLevel} already exists.`, 409);
  }

  const renames = SPRITE_KINDS.flatMap((kind) => {
    const current = entry.sprite[kind];
    if (!current) return [];
    return [{ from: path.basename(current), to: buildMonsterSpriteFilename(entry.name, edit.nextLevel, edit.nextIsBoss, kind) }];
  });
  const movedFrom = new Set(renames.map((rename) => rename.from));
  const nextFilenames = [
    ...snapshot.filenames.filter((filename) => !movedFrom.has(filename)),
    ...renames.map((rename) => rename.to),
  ].sort();

  return {
    kind: 'changed',
    entry: findMonsterEntry(buildMonsterCatalogEntries(nextFilenames), entry.name, edit.nextLevel) as MonsterCatalogEntry,
    renames,
    removals: [],
    nextFilenames,
  };
}

export function planMonsterRemoval(removal: { name: string; level: number }, snapshot: CatalogSnapshot): PlanFailure | ChangedPlan {
  const entry = findMonsterEntry(snapshot.entries, removal.name, removal.level);
  if (!entry) return failure(`No monster named "${removal.name}" at level ${removal.level}.`, 404);
  if (isSeedEntry(entry)) return failure(`${entry.name} is a seed monster and can't be removed.`, 403);

  const removals = spriteFilesOf(entry);
  return {
    kind: 'changed',
    entry,
    renames: [],
    removals,
    nextFilenames: snapshot.filenames.filter((filename) => !removals.includes(filename)),
  };
}

