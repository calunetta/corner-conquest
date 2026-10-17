import { MAX_UPLOAD_BYTES } from '@/app/api/tile-fog-variants/upload';
import { SEED_MONSTER_CATALOG } from '@/modules/game-rules';
import { createGifFile, extraMonsterEntry, sampleCatalog } from './MonsterSpriteUploader.fixtures';
import {
  clampLevelForBossFlag,
  getLevelOptions,
  isGifFile,
  showsBossSoftWarning,
  toCatalogRowViewModels,
  validateMonsterName,
  validateSpriteFile,
} from './MonsterSpriteUploader.map';

function fileOfSize(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('toCatalogRowViewModels', () => {
  it('marks every seed isSeed true and a non-seed entry false, keeping order and fields', () => {
    const rows = toCatalogRowViewModels(sampleCatalog);

    expect(rows).toHaveLength(SEED_MONSTER_CATALOG.length + 1);
    expect(rows.slice(0, 4).map((row) => row.isSeed)).toEqual([true, true, true, true]);
    expect(rows[4]).toEqual({
      name: 'Fire Ogre',
      level: 2,
      isBoss: false,
      idleSprite: '/monster/fire-ogre-lvl2-idle.gif',
      isSeed: false,
      isEditable: true,
      levelOptions: getLevelOptions(false),
    });
  });

  it('marks seed rows not editable and uploaded rows editable', () => {
    const rows = toCatalogRowViewModels(sampleCatalog);
    expect(rows.map((row) => row.isEditable)).toEqual([false, false, false, false, true]);
  });

  it('gives a boss row 4 level options and a non-boss row 3', () => {
    const bossEntry = { ...extraMonsterEntry, name: 'Ice Dragon' as typeof extraMonsterEntry.name, level: 4 as const, isBoss: true };
    const [nonBossRow, bossRow] = toCatalogRowViewModels([extraMonsterEntry, bossEntry]);
    expect(nonBossRow.levelOptions.map((option) => option.value)).toEqual([1, 2, 3]);
    expect(bossRow.levelOptions.map((option) => option.value)).toEqual([1, 2, 3, 4]);
  });

  it('treats a seed name at a different level as non-seed', () => {
    const rows = toCatalogRowViewModels([{ ...SEED_MONSTER_CATALOG[0], level: 2 }]);
    expect(rows[0].isSeed).toBe(false);
  });

  it('returns an empty list for an empty catalog', () => {
    expect(toCatalogRowViewModels([])).toEqual([]);
  });

  it('does not mutate the input catalog', () => {
    const copy = JSON.parse(JSON.stringify([extraMonsterEntry]));
    toCatalogRowViewModels([extraMonsterEntry]);
    expect([extraMonsterEntry]).toEqual(copy);
  });
});

describe('getLevelOptions', () => {
  it('offers levels 1 to 3 with Little/Big labels for non-bosses', () => {
    expect(getLevelOptions(false)).toEqual([
      { value: 1, label: '1 — Little' },
      { value: 2, label: '2 — Little' },
      { value: 3, label: '3 — Big' },
    ]);
  });

  it('adds level 4 for bosses', () => {
    expect(getLevelOptions(true).map((option) => option.value)).toEqual([1, 2, 3, 4]);
    expect(getLevelOptions(true)[3].label).toBe('4 — Big');
  });
});

describe('showsBossSoftWarning', () => {
  it.each([
    { isBoss: true, level: 1, expected: true },
    { isBoss: true, level: 2, expected: true },
    { isBoss: true, level: 3, expected: false },
    { isBoss: true, level: 4, expected: false },
    { isBoss: true, level: null, expected: false },
    { isBoss: false, level: 1, expected: false },
    { isBoss: false, level: 2, expected: false },
    { isBoss: false, level: null, expected: false },
  ])('isBoss=$isBoss level=$level gives $expected', ({ isBoss, level, expected }) => {
    expect(showsBossSoftWarning(isBoss, level)).toBe(expected);
  });
});

describe('clampLevelForBossFlag', () => {
  it.each([
    { level: 4, isBoss: false, expected: 3 },
    { level: 3, isBoss: false, expected: 3 },
    { level: 2, isBoss: false, expected: 2 },
    { level: 1, isBoss: false, expected: 1 },
    { level: 4, isBoss: true, expected: 4 },
    { level: 2, isBoss: true, expected: 2 },
    { level: null, isBoss: true, expected: null },
    { level: null, isBoss: false, expected: null },
  ] as const)('level $level with isBoss=$isBoss gives $expected', ({ level, isBoss, expected }) => {
    expect(clampLevelForBossFlag(level, isBoss)).toBe(expected);
  });
});

describe('validateMonsterName', () => {
  it.each(['!!!', '', '   ', '---'])('returns the message for "%s"', (name) => {
    expect(validateMonsterName(name)).toBe('Name needs at least one letter or digit.');
  });

  it.each(['Fire Ogre', 'imp2', '7'])('returns null for "%s"', (name) => {
    expect(validateMonsterName(name)).toBeNull();
  });
});

describe('isGifFile', () => {
  it.each([
    { name: 'a.gif', type: 'image/gif', expected: true },
    { name: 'a.png', type: 'image/gif', expected: true },
    { name: 'a.GIF', type: '', expected: true },
    { name: 'a.gif', type: 'image/png', expected: true },
    { name: 'a.png', type: 'image/png', expected: false },
    { name: 'gif', type: '', expected: false },
    { name: 'a.gif.txt', type: 'text/plain', expected: false },
  ])('name=$name type=$type gives $expected', ({ name, type, expected }) => {
    expect(isGifFile(new File(['x'], name, { type }))).toBe(expected);
  });
});

describe('validateSpriteFile', () => {
  it('returns null for a small GIF', () => {
    expect(validateSpriteFile(createGifFile(), 'idle')).toBeNull();
  });

  it('returns null for a GIF exactly at MAX_UPLOAD_BYTES', () => {
    expect(validateSpriteFile(fileOfSize('a.gif', 'image/gif', MAX_UPLOAD_BYTES), 'attack')).toBeNull();
  });

  it('rejects a non-GIF naming the kind', () => {
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    expect(validateSpriteFile(png, 'idle')).toBe('The idle sprite must be a GIF.');
    expect(validateSpriteFile(png, 'attack')).toBe('The attack sprite must be a GIF.');
  });

  it('rejects a GIF over MAX_UPLOAD_BYTES', () => {
    expect(validateSpriteFile(fileOfSize('a.gif', 'image/gif', MAX_UPLOAD_BYTES + 1), 'idle')).toBe(
      'Each file must be 2 MB or smaller.',
    );
  });

  it('reports the type error before the size error', () => {
    expect(validateSpriteFile(fileOfSize('a.png', 'image/png', MAX_UPLOAD_BYTES + 1), 'idle')).toBe(
      'The idle sprite must be a GIF.',
    );
  });
});
