import {
  getMaxLevelForBossFlag,
  MIN_LEVEL,
  SEED_MONSTER_CATALOG,
  toCatalogEntryKey,
  toMonsterSpriteSlug,
} from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { MAX_UPLOAD_BYTES } from '@/app/api/tile-fog-variants/upload';
import type { LevelOption, MonsterCatalogRowViewModel, MonsterLevel } from './MonsterSpriteUploader.types';

const FIRST_BIG_LEVEL = 3;
const BOSS_POOL_LITTLE_LEVELS: Array<number | null> = [1, 2];

export function toCatalogRowViewModels(catalog: MonsterCatalogEntry[]): MonsterCatalogRowViewModel[] {
  const seedKeys = new Set(SEED_MONSTER_CATALOG.map((seed) => toCatalogEntryKey(seed.name, seed.level)));
  return catalog.map((entry) => {
    const isSeed = seedKeys.has(toCatalogEntryKey(entry.name, entry.level));
    return {
      name: entry.name,
      level: entry.level,
      isBoss: entry.isBoss,
      idleSprite: entry.sprite.idle,
      isSeed,
      isEditable: !isSeed,
      levelOptions: getLevelOptions(entry.isBoss),
    };
  });
}

export function getLevelOptions(isBoss: boolean): LevelOption[] {
  const maxLevel = getMaxLevelForBossFlag(isBoss);
  const levels: MonsterLevel[] = [1, 2, 3, 4];
  return levels
    .filter((level) => level >= MIN_LEVEL && level <= maxLevel)
    .map((level) => ({ value: level, label: `${level} — ${level >= FIRST_BIG_LEVEL ? 'Big' : 'Little'}` }));
}

/** A boss at a little level (1-2) never gets drawn from the boss pool, so nudge the user. */
export function showsBossSoftWarning(isBoss: boolean, level: number | null): boolean {
  return isBoss && BOSS_POOL_LITTLE_LEVELS.includes(level);
}

/** Only ever lowers a level that the new Boss flag no longer allows; never raises one. */
export function clampLevelForBossFlag(level: MonsterLevel | null, isBoss: boolean): MonsterLevel | null {
  if (level === null) return null;
  const maxLevel = getMaxLevelForBossFlag(isBoss);
  return level > maxLevel ? (maxLevel as MonsterLevel) : level;
}

export function validateMonsterName(name: string): string | null {
  return toMonsterSpriteSlug(name) === '' ? 'Name needs at least one letter or digit.' : null;
}

export function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

/** Client-side pre-check on file pick; the route re-checks size and GIF bytes. Copy mirrors the route. */
export function validateSpriteFile(file: File, kind: 'idle' | 'attack'): string | null {
  if (!isGifFile(file)) return `The ${kind} sprite must be a GIF.`;
  if (file.size > MAX_UPLOAD_BYTES) return 'Each file must be 2 MB or smaller.';
  return null;
}
