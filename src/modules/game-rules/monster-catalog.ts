import type { Monster } from '@/lib/types';
import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import { MONSTER_CATALOG } from './monster-catalog.generated';
import type { MonsterCatalogEntry } from './monster-catalog.types';

export { MONSTER_CATALOG };

/** Every monster shares one death sprite; the filename convention has no death variant. */
const SHARED_DEATH_SPRITE = '/sprites/death.gif';

const BIG_MONSTER_CHANCE = 0.3;
const LEVEL_FOUR_CHANCE = 0.25;
const LEVEL_ONE_CHANCE = 0.6;
const SINGLE_LITTLE_MONSTER_CHANCE = 0.7;

export function getNonBossCandidatesByLevel(level: number): MonsterCatalogEntry[] {
  return MONSTER_CATALOG.filter((entry) => entry.level === level && !entry.isBoss);
}

export function getBossCandidates(): MonsterCatalogEntry[] {
  return MONSTER_CATALOG.filter((entry) => entry.isBoss);
}

/** First catalog entry at `level`, in catalog order. Deterministic, for decorative consumers. */
export function getFirstMonsterAtLevel(level: number): MonsterCatalogEntry | undefined {
  return MONSTER_CATALOG.find((entry) => entry.level === level);
}

/** A missing attack sprite falls back to idle while Monster.sprite.attack is still required. */
export function toMonster(entry: MonsterCatalogEntry): Monster {
  return {
    name: entry.name,
    level: entry.level,
    sprite: {
      idle: entry.sprite.idle,
      attack: entry.sprite.attack ?? entry.sprite.idle,
      death: SHARED_DEATH_SPRITE,
    },
  };
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Picks a monster at `level`, or at one of `fallbackLevels` in order when that level has no candidate. */
function pickMonsterAtLevel(level: number, fallbackLevels: number[]): Monster | undefined {
  for (const candidateLevel of [level, ...fallbackLevels]) {
    const candidates = getNonBossCandidatesByLevel(candidateLevel);
    if (candidates.length > 0) return toMonster(pickRandom(candidates));
  }
  return undefined;
}

function toPossibleLevels(distance: number): number[] {
  if (distance <= 1) return [3, 4];
  if (distance <= 3) return [1, 2, 3];
  return [1, 2];
}

function rollBigMonster(possibleLevels: number[]): Monster | undefined {
  const rolledLevel = possibleLevels.includes(4) && Math.random() < LEVEL_FOUR_CHANCE ? 4 : 3;
  const siblingLevel = rolledLevel === 4 ? 3 : 4;
  // The sibling level only applies where this tile's distance allows it.
  return pickMonsterAtLevel(rolledLevel, possibleLevels.includes(siblingLevel) ? [siblingLevel] : []);
}

function rollLittleMonster(level: number): Monster | undefined {
  return pickMonsterAtLevel(level, [level === 1 ? 2 : 1]);
}

function rollLittleMonsters(possibleLevels: number[]): Array<Monster | undefined> {
  const numMonsters = Math.random() < SINGLE_LITTLE_MONSTER_CHANCE ? 1 : 2;
  let littleLevels = possibleLevels.filter((level) => level <= 2);
  if (littleLevels.length === 0) littleLevels = [1];

  return Array.from({ length: numMonsters }, () => rollLittleMonster(pickRandom(littleLevels)));
}

/** May return an empty array when no level has a candidate; the caller decides what the tile becomes. */
export function generateMonsters(x: number, y: number): Monster[] {
  const centerX = Math.floor(MAP_COLS / 2);
  const centerY = Math.floor(MAP_ROWS / 2);
  const distance = Math.abs(x - centerX) + Math.abs(y - centerY);
  const possibleLevels = toPossibleLevels(distance);

  const hasBigMonster = possibleLevels.includes(3) && Math.random() < BIG_MONSTER_CHANCE;
  const rolled = hasBigMonster
    ? [rollBigMonster(possibleLevels), rollLittleMonster(Math.random() < LEVEL_ONE_CHANCE ? 1 : 2)]
    : rollLittleMonsters(possibleLevels);

  // Prevent duplicate monsters on the same tile
  const uniqueMonsters: Monster[] = [];
  for (const monster of rolled) {
    if (monster && !uniqueMonsters.some((existing) => existing.name === monster.name)) {
      uniqueMonsters.push(monster);
    }
  }
  return uniqueMonsters;
}

/** Uniform pick among boss candidates; undefined when the pool is empty. */
export function pickBossMonster(): Monster | undefined {
  const bosses = getBossCandidates();
  if (bosses.length === 0) return undefined;
  return toMonster(pickRandom(bosses));
}
