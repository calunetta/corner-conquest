// Pure helpers for the monster catalog upload route, kept out of route.ts so they can be unit
// tested without fs, Request or File polyfills.
import {
  getMaxLevelForBossFlag,
  MAX_BOSS_LEVEL,
  MIN_LEVEL,
  toMonsterSpriteSlug,
} from '@/modules/game-rules/monster-catalog-generator';
import { isGifBytes, MAX_UPLOAD_BYTES } from '../tile-fog-variants/upload';

export interface MonsterUploadFields {
  name: string;
  level: number;
  isBoss: boolean;
  idle: File;
  attack: File | null;
}

export interface UploadFieldError {
  message: string;
  field: 'name' | 'level' | 'idle' | 'attack';
  status: 400 | 413;
}

const fieldError = (field: UploadFieldError['field'], message: string, status: 400 | 413 = 400): UploadFieldError => ({
  message,
  field,
  status,
});

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

/** Reads name/level/isBoss/idle/attack off FormData and validates presence, name slug and the
 *  level cap. File bytes are checked separately (validateSpriteBytes) because reading them is async. */
export function parseMonsterUploadFields(formData: FormData): MonsterUploadFields | UploadFieldError {
  const name = formData.get('name');
  if (typeof name !== 'string' || toMonsterSpriteSlug(name) === '') {
    return fieldError('name', 'The name needs at least one letter or digit.');
  }

  const isBoss = formData.get('isBoss') === 'true';
  const levelText = formData.get('level');
  const level = typeof levelText === 'string' && levelText.trim() !== '' ? Number(levelText) : Number.NaN;
  const maxLevel = getMaxLevelForBossFlag(isBoss);
  if (!Number.isInteger(level) || level < MIN_LEVEL || level > maxLevel) {
    return fieldError('level', 'Non-boss monsters go up to level 3; boss monsters go up to level 4.');
  }

  const idle = formData.get('idle');
  if (!isFile(idle)) return fieldError('idle', 'An idle sprite is required.');

  const attack = formData.get('attack');
  if (attack !== null && !isFile(attack)) return fieldError('attack', 'The attack sprite must be a GIF.');

  return { name: name.trim(), level, isBoss, idle, attack };
}

export interface MonsterEditRequest {
  name: string;
  /** The monster's current level, which identifies it in the catalog. */
  level: number;
  nextLevel: number;
  nextIsBoss: boolean;
}

const LEVEL_RANGE_MESSAGE = `Level must be a whole number from ${MIN_LEVEL} to ${MAX_BOSS_LEVEL}.`;

/** Reads the JSON body of PATCH /api/monster-catalog. Level caps follow the target Boss flag. */
export function parseMonsterEditBody(body: unknown): MonsterEditRequest | UploadFieldError {
  if (typeof body !== 'object' || body === null) return fieldError('name', 'The request body is not a monster edit.');
  const { name, level, nextLevel, nextIsBoss } = body as Record<string, unknown>;

  if (typeof name !== 'string' || toMonsterSpriteSlug(name) === '') {
    return fieldError('name', 'The name needs at least one letter or digit.');
  }
  if (!isWholeNumberInRange(level, MIN_LEVEL, MAX_BOSS_LEVEL)) return fieldError('level', LEVEL_RANGE_MESSAGE);
  if (typeof nextIsBoss !== 'boolean') return fieldError('level', 'Boss must be true or false.');
  const maxNextLevel = getMaxLevelForBossFlag(nextIsBoss);
  if (!isWholeNumberInRange(nextLevel, MIN_LEVEL, maxNextLevel)) {
    return fieldError('level', 'Non-boss monsters go up to level 3; boss monsters go up to level 4.');
  }
  return { name: name.trim(), level, nextLevel, nextIsBoss };
}

function isWholeNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** Size (MAX_UPLOAD_BYTES) and GIF magic-byte checks for one already-read file. */
export function validateSpriteBytes(bytes: Uint8Array, field: 'idle' | 'attack'): UploadFieldError | null {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return fieldError(field, 'Each file must be 2 MB or smaller.', 413);
  if (!isGifBytes(bytes)) return fieldError(field, `The ${field} sprite must be a GIF.`);
  return null;
}
