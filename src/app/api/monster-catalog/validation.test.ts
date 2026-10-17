import { MAX_UPLOAD_BYTES } from '../tile-fog-variants/upload';
import { parseMonsterEditBody, parseMonsterUploadFields, validateSpriteBytes } from './validation';
import type { MonsterUploadFields, UploadFieldError } from './validation';

const gif = (name = 'sprite.gif'): File => new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], name, { type: 'image/gif' });

// Real FormData.get returns null (not undefined) for an absent field; the stub keeps that contract.
function toFormData(fields: Record<string, FormDataEntryValue | undefined>): FormData {
  const entries = new Map<string, FormDataEntryValue>();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) entries.set(key, value);
  }
  return { get: (key: string) => entries.get(key) ?? null } as unknown as FormData;
}

describe('parseMonsterUploadFields', () => {
  it('returns the parsed fields for a valid non-boss upload with no attack file', () => {
    const idle = gif();
    const result = parseMonsterUploadFields(toFormData({ name: 'Fire Ogre', level: '2', isBoss: 'false', idle }));
    expect(result).toEqual({ name: 'Fire Ogre', level: 2, isBoss: false, idle, attack: null });
  });

  it('returns the attack file and boss flag when provided, trimming the name', () => {
    const idle = gif('i.gif');
    const attack = gif('a.gif');
    const result = parseMonsterUploadFields(
      toFormData({ name: '  Dragon  ', level: '4', isBoss: 'true', idle, attack }),
    ) as MonsterUploadFields;
    expect(result).toEqual({ name: 'Dragon', level: 4, isBoss: true, idle, attack });
  });

  it('treats a missing isBoss field as non-boss', () => {
    const result = parseMonsterUploadFields(toFormData({ name: 'Imp', level: '3', idle: gif() })) as MonsterUploadFields;
    expect(result.isBoss).toBe(false);
  });

  it.each([
    { title: 'missing name', fields: { level: '1', idle: gif() }, field: 'name' },
    { title: 'name that normalizes to an empty slug', fields: { name: '!!!', level: '1', idle: gif() }, field: 'name' },
    { title: 'blank name', fields: { name: '   ', level: '1', idle: gif() }, field: 'name' },
    { title: 'file given as name', fields: { name: gif(), level: '1', idle: gif() }, field: 'name' },
    { title: 'missing level', fields: { name: 'Imp', idle: gif() }, field: 'level' },
    { title: 'blank level', fields: { name: 'Imp', level: ' ', idle: gif() }, field: 'level' },
    { title: 'non-numeric level', fields: { name: 'Imp', level: 'abc', idle: gif() }, field: 'level' },
    { title: 'fractional level', fields: { name: 'Imp', level: '1.5', idle: gif() }, field: 'level' },
    { title: 'level 0', fields: { name: 'Imp', level: '0', idle: gif() }, field: 'level' },
    { title: 'level 4 without isBoss', fields: { name: 'Imp', level: '4', isBoss: 'false', idle: gif() }, field: 'level' },
    { title: 'level 5 with isBoss', fields: { name: 'Imp', level: '5', isBoss: 'true', idle: gif() }, field: 'level' },
    { title: 'missing idle', fields: { name: 'Imp', level: '1' }, field: 'idle' },
    { title: 'idle given as a string', fields: { name: 'Imp', level: '1', idle: 'nope' }, field: 'idle' },
    { title: 'attack given as a string', fields: { name: 'Imp', level: '1', idle: gif(), attack: 'nope' }, field: 'attack' },
  ])('rejects $title with a 400 error on the $field field', ({ fields, field }) => {
    const result = parseMonsterUploadFields(toFormData(fields)) as UploadFieldError;
    expect(result.field).toBe(field);
    expect(result.status).toBe(400);
    expect(result.message).not.toBe('');
  });

  it.each([
    { level: '3', isBoss: 'false' },
    { level: '1', isBoss: 'true' },
    { level: '4', isBoss: 'true' },
  ])('accepts level $level with isBoss=$isBoss at the cap', ({ level, isBoss }) => {
    const result = parseMonsterUploadFields(toFormData({ name: 'Imp', level, isBoss, idle: gif() }));
    expect('message' in result).toBe(false);
  });
});

describe('validateSpriteBytes', () => {
  const gifHeader = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

  it('returns null for GIF bytes under the size cap', () => {
    expect(validateSpriteBytes(new Uint8Array(gifHeader), 'idle')).toBeNull();
  });

  it('returns null for GIF bytes exactly at the size cap', () => {
    const bytes = new Uint8Array(MAX_UPLOAD_BYTES);
    bytes.set(gifHeader);
    expect(validateSpriteBytes(bytes, 'attack')).toBeNull();
  });

  it('returns a 413 size error on the given field for bytes over the cap', () => {
    const bytes = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    bytes.set(gifHeader);
    expect(validateSpriteBytes(bytes, 'attack')).toEqual({
      message: 'Each file must be 2 MB or smaller.',
      field: 'attack',
      status: 413,
    });
  });

  it('returns a 400 type error for PNG magic bytes', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateSpriteBytes(png, 'idle')).toEqual({
      message: 'The idle sprite must be a GIF.',
      field: 'idle',
      status: 400,
    });
  });

  it('returns a 400 type error for empty bytes', () => {
    expect(validateSpriteBytes(new Uint8Array(0), 'idle')?.status).toBe(400);
  });

  it('reports the size error before the type error when both apply', () => {
    expect(validateSpriteBytes(new Uint8Array(MAX_UPLOAD_BYTES + 1), 'idle')?.status).toBe(413);
  });
});

describe('parseMonsterEditBody', () => {
  const validBody = { name: 'Fire Ogre', level: 2, nextLevel: 3, nextIsBoss: false };

  it('returns the parsed edit for a valid body, trimming the name', () => {
    expect(parseMonsterEditBody({ ...validBody, name: '  Fire Ogre  ' })).toEqual(validBody);
  });

  it.each([null, undefined, 'text', 5])('rejects the non-object body %p on the name field with status 400', (body) => {
    expect(parseMonsterEditBody(body)).toEqual({
      message: 'The request body is not a monster edit.',
      field: 'name',
      status: 400,
    });
  });

  it.each([
    { title: 'a missing name', patch: { name: undefined } },
    { title: 'a non-string name', patch: { name: 7 } },
    { title: 'a name with an empty slug', patch: { name: '!!!' } },
  ])('rejects $title on the name field', ({ patch }) => {
    expect(parseMonsterEditBody({ ...validBody, ...patch })).toEqual({
      message: 'The name needs at least one letter or digit.',
      field: 'name',
      status: 400,
    });
  });

  it.each([
    { title: 'current level 0', patch: { level: 0 } },
    { title: 'current level 5', patch: { level: 5 } },
    { title: 'a non-integer current level', patch: { level: 1.5 } },
    { title: 'a string current level', patch: { level: '2' } },
  ])('rejects $title on the level field', ({ patch }) => {
    const result = parseMonsterEditBody({ ...validBody, ...patch }) as UploadFieldError;
    expect(result.field).toBe('level');
    expect(result.status).toBe(400);
    expect(result.message).toBe('Level must be a whole number from 1 to 4.');
  });

  it.each([
    { title: 'next level 0', patch: { nextLevel: 0 } },
    { title: 'next level 5', patch: { nextLevel: 5 } },
    { title: 'a non-integer next level', patch: { nextLevel: 2.5 } },
    { title: 'a string next level', patch: { nextLevel: '2' } },
    { title: 'a missing next level', patch: { nextLevel: undefined } },
  ])('rejects $title on the level field', ({ patch }) => {
    expect(parseMonsterEditBody({ ...validBody, ...patch })).toEqual({
      message: 'Non-boss monsters go up to level 3; boss monsters go up to level 4.',
      field: 'level',
      status: 400,
    });
  });

  it.each([{ nextIsBoss: 'true' }, { nextIsBoss: 1 }, { nextIsBoss: undefined }])(
    'rejects nextIsBoss %p because it is not a boolean',
    (patch) => {
      expect(parseMonsterEditBody({ ...validBody, ...patch })).toEqual({
        message: 'Boss must be true or false.',
        field: 'level',
        status: 400,
      });
    },
  );

  it('rejects next level 4 when the target is not a boss', () => {
    expect(parseMonsterEditBody({ ...validBody, nextLevel: 4, nextIsBoss: false })).toEqual({
      message: 'Non-boss monsters go up to level 3; boss monsters go up to level 4.',
      field: 'level',
      status: 400,
    });
  });

  it('accepts next level 4 when the target is a boss', () => {
    expect(parseMonsterEditBody({ ...validBody, nextLevel: 4, nextIsBoss: true })).toEqual({
      name: 'Fire Ogre',
      level: 2,
      nextLevel: 4,
      nextIsBoss: true,
    });
  });
});
