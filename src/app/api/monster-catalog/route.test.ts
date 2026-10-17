// Same harness as src/app/api/icon-editor/uploads/route.test.ts: jsdom lacks Request/Response/fetch,
// which next/server needs, so polyfill from undici before the route loads (plain require, not import).
/* eslint-disable @typescript-eslint/no-require-imports -- see comment above */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
const { Headers, Request, Response, fetch } = require('undici');
Object.assign(globalThis, { Headers, Request, Response, fetch });

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
}));

import path from 'path';
import type {
  mkdir as MkdirFn,
  readdir as ReaddirFn,
  readFile as ReadFileFn,
  unlink as UnlinkFn,
  writeFile as WriteFileFn,
} from 'fs/promises';
import type { PATCH as PatchFn, POST as PostFn } from './route';
import {
  buildMonsterCatalogEntries,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from '@/modules/game-rules/monster-catalog-generator';

const { readdir, mkdir, writeFile, readFile, unlink } = require('fs/promises') as {
  readdir: jest.Mock & typeof ReaddirFn;
  mkdir: jest.Mock & typeof MkdirFn;
  writeFile: jest.Mock & typeof WriteFileFn;
  readFile: jest.Mock & typeof ReadFileFn;
  unlink: jest.Mock & typeof UnlinkFn;
};
const { POST, PATCH } = require('./route') as { POST: typeof PostFn; PATCH: typeof PatchFn };
/* eslint-enable @typescript-eslint/no-require-imports */

const SPRITE_DIR = path.join(process.cwd(), 'public/monster');
const CATALOG_PATH = path.join(process.cwd(), 'src/modules/game-rules/monster-catalog.generated.ts');
const NAMES_PATH = path.join(process.cwd(), 'src/lib/types/monsters.generated.ts');
const GIF_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true });
}

function spriteFile(name: string, bytes: Uint8Array = GIF_BYTES): File {
  const file = new File([bytes], name, { type: 'image/gif' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  return file;
}

// Real FormData.get returns null (not undefined) for an absent field; the stub keeps that contract.
function postUpload(fields: Record<string, FormDataEntryValue | undefined>): Promise<Response> {
  const entries = new Map<string, FormDataEntryValue>();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) entries.set(key, value);
  }
  const request = { formData: async () => ({ get: (key: string) => entries.get(key) ?? null }) as unknown as FormData } as unknown as Request;
  return POST(request);
}

const validFields = (): Record<string, FormDataEntryValue> => ({
  name: 'Fire Ogre',
  level: '2',
  isBoss: 'false',
  idle: spriteFile('idle.gif'),
});

describe('POST /api/monster-catalog', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    readdir.mockResolvedValue([]);
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    jest.clearAllMocks();
  });

  it('returns 404 and writes nothing in production', async () => {
    setNodeEnv('production');

    const response = await postUpload(validFields());

    expect(response.status).toBe(404);
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it.each([
    { title: 'a missing name', fields: { level: '1', idle: spriteFile('i.gif') }, field: 'name', status: 400 },
    { title: 'a level above the non-boss cap', fields: { name: 'Imp', level: '4', idle: spriteFile('i.gif') }, field: 'level', status: 400 },
    { title: 'a missing idle file', fields: { name: 'Imp', level: '1' }, field: 'idle', status: 400 },
    {
      title: 'an idle file that is not a GIF',
      fields: { name: 'Imp', level: '1', idle: spriteFile('i.gif', new Uint8Array([0x89, 0x50, 0x4e, 0x47])) },
      field: 'idle',
      status: 400,
    },
    {
      title: 'an attack file that is not a GIF',
      fields: { name: 'Imp', level: '1', idle: spriteFile('i.gif'), attack: spriteFile('a.gif', new Uint8Array([1, 2, 3, 4])) },
      field: 'attack',
      status: 400,
    },
    {
      title: 'an oversized idle file',
      fields: {
        name: 'Imp',
        level: '1',
        idle: spriteFile('i.gif', Object.assign(new Uint8Array(2 * 1024 * 1024 + 1), GIF_BYTES)),
      },
      field: 'idle',
      status: 413,
    },
  ])('rejects $title and writes nothing', async ({ fields, field, status }) => {
    const response = await postUpload(fields);
    const body = (await response.json()) as { error: string; field: string };

    expect(response.status).toBe(status);
    expect(body.field).toBe(field);
    expect(body.error).not.toBe('');
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('returns 409 on the name field and writes nothing when the name and level already exist in the scan', async () => {
    readdir.mockResolvedValue(['fire-ogre-lvl2-idle.gif']);

    const response = await postUpload({ ...validFields(), name: 'fire ogre' });
    const body = (await response.json()) as { error: string; field: string };

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'A monster named "fire ogre" at level 2 already exists.', field: 'name' });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('returns 409 when the name and level match a seed that is missing from disk', async () => {
    const response = await postUpload({ ...validFields(), name: 'Lancer', level: '1' });

    expect(response.status).toBe(409);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('accepts the same name at a different level', async () => {
    readdir.mockResolvedValue(['fire-ogre-lvl2-idle.gif']);

    const response = await postUpload({ ...validFields(), level: '3' });

    expect(response.status).toBe(200);
  });

  it('writes the idle sprite and both generated files, and returns the new entry (no attack file)', async () => {
    readdir.mockResolvedValue(['zzz.txt', 'lancer-lvl1-idle.gif']);

    const response = await postUpload(validFields());
    const body = (await response.json()) as { entry: unknown };

    const expectedEntries = buildMonsterCatalogEntries(['fire-ogre-lvl2-idle.gif', 'lancer-lvl1-idle.gif']);
    expect(response.status).toBe(200);
    expect(mkdir).toHaveBeenCalledWith(SPRITE_DIR, { recursive: true });
    expect(writeFile.mock.calls).toEqual([
      [path.join(SPRITE_DIR, 'fire-ogre-lvl2-idle.gif'), GIF_BYTES],
      [CATALOG_PATH, renderMonsterCatalogSource(expectedEntries)],
      [NAMES_PATH, renderMonsterNameSource(expectedEntries.map((entry) => entry.name))],
    ]);
    expect(body.entry).toEqual({
      name: 'Fire Ogre',
      level: 2,
      isBoss: false,
      sprite: { idle: '/monster/fire-ogre-lvl2-idle.gif' },
    });
  });

  it('writes the attack sprite too and links both paths in the returned entry for a boss', async () => {
    const response = await postUpload({
      name: 'Ice Dragon',
      level: '4',
      isBoss: 'true',
      idle: spriteFile('i.gif'),
      attack: spriteFile('a.gif'),
    });
    const body = (await response.json()) as { entry: unknown };

    const expectedEntries = buildMonsterCatalogEntries([
      'boss-ice-dragon-lvl4-attack.gif',
      'boss-ice-dragon-lvl4-idle.gif',
    ]);
    expect(response.status).toBe(200);
    expect(writeFile.mock.calls).toEqual([
      [path.join(SPRITE_DIR, 'boss-ice-dragon-lvl4-idle.gif'), GIF_BYTES],
      [path.join(SPRITE_DIR, 'boss-ice-dragon-lvl4-attack.gif'), GIF_BYTES],
      [CATALOG_PATH, renderMonsterCatalogSource(expectedEntries)],
      [NAMES_PATH, renderMonsterNameSource(expectedEntries.map((entry) => entry.name))],
    ]);
    expect(body.entry).toEqual({
      name: 'Ice Dragon',
      level: 4,
      isBoss: true,
      sprite: { idle: '/monster/boss-ice-dragon-lvl4-idle.gif', attack: '/monster/boss-ice-dragon-lvl4-attack.gif' },
    });
  });

  it('treats a missing sprite folder as empty and still succeeds', async () => {
    readdir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const response = await postUpload(validFields());

    expect(response.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(3);
  });
});

describe('PATCH /api/monster-catalog', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const SEED_FILES = [
    'lancer-lvl1-idle.gif',
    'lancer-lvl1-attack.gif',
    'bear-lvl2-idle.gif',
    'bear-lvl2-attack.gif',
    'ogre-lvl3-idle.gif',
    'ogre-lvl3-attack.gif',
    'boss-minotaur-lvl4-idle.gif',
    'boss-minotaur-lvl4-attack.gif',
  ];
  const OGRE_FILES = ['fire-ogre-lvl2-idle.gif', 'fire-ogre-lvl2-attack.gif'];
  const FILE_BYTES = Buffer.from('GIF89a');

  function patch(body: unknown): Promise<Response> {
    return PATCH({ json: async () => body } as unknown as Request);
  }

  const fireOgreEdit = { name: 'Fire Ogre', level: 2, nextLevel: 2, nextIsBoss: false };

  function expectNothingChanged(): void {
    expect(writeFile).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    readdir.mockResolvedValue([...SEED_FILES, ...OGRE_FILES]);
    readFile.mockResolvedValue(FILE_BYTES);
    writeFile.mockResolvedValue(undefined);
    unlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    jest.resetAllMocks();
  });

  it('returns 404 and writes nothing in production', async () => {
    setNodeEnv('production');

    const response = await patch({ ...fireOgreEdit, nextIsBoss: true });

    expect(response.status).toBe(404);
    expectNothingChanged();
  });

  it('returns 400 and writes nothing for an invalid body', async () => {
    const response = await patch({ ...fireOgreEdit, nextLevel: 4 });
    const body = (await response.json()) as { error: string; field: string };

    expect(response.status).toBe(400);
    expect(body.field).toBe('level');
    expect(body.error).toBe('Non-boss monsters go up to level 3; boss monsters go up to level 4.');
    expectNothingChanged();
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const response = await PATCH({
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as Request);

    expect(response.status).toBe(400);
    expectNothingChanged();
  });

  it('returns 404 when no monster has that name and level', async () => {
    const response = await patch({ name: 'Ghost', level: 1, nextLevel: 2, nextIsBoss: false });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('No monster named "Ghost" at level 1.');
    expectNothingChanged();
  });

  it('returns 403 for a seed monster and writes nothing', async () => {
    const response = await patch({ name: 'Lancer', level: 1, nextLevel: 2, nextIsBoss: false });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Lancer is a seed monster and can't be changed here.");
    expectNothingChanged();
  });

  it('returns 200 with the unchanged entry and writes nothing when nothing changed', async () => {
    const response = await patch(fireOgreEdit);
    const body = (await response.json()) as { entry: unknown };

    expect(response.status).toBe(200);
    expect(body.entry).toEqual({
      name: 'Fire Ogre',
      level: 2,
      isBoss: false,
      sprite: { idle: '/monster/fire-ogre-lvl2-idle.gif', attack: '/monster/fire-ogre-lvl2-attack.gif' },
    });
    expectNothingChanged();
  });

  it('returns 409 and writes nothing when another entry already has the target name and level', async () => {
    readdir.mockResolvedValue([...SEED_FILES, ...OGRE_FILES, 'fire-ogre-lvl3-idle.gif']);

    const response = await patch({ ...fireOgreEdit, nextLevel: 3 });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe('A monster named "Fire Ogre" at level 3 already exists.');
    expectNothingChanged();
  });

  it('moves both sprites to boss names when only Boss changes, then rewrites both sources', async () => {
    const response = await patch({ ...fireOgreEdit, nextIsBoss: true });
    const body = (await response.json()) as { entry: unknown };

    const nextFilenames = [
      ...SEED_FILES,
      'boss-fire-ogre-lvl2-idle.gif',
      'boss-fire-ogre-lvl2-attack.gif',
    ].sort();
    const expectedEntries = buildMonsterCatalogEntries(nextFilenames);
    expect(response.status).toBe(200);
    expect(readFile.mock.calls).toEqual([
      [path.join(SPRITE_DIR, 'fire-ogre-lvl2-idle.gif')],
      [path.join(SPRITE_DIR, 'fire-ogre-lvl2-attack.gif')],
    ]);
    expect(writeFile.mock.calls).toEqual([
      [path.join(SPRITE_DIR, 'boss-fire-ogre-lvl2-idle.gif'), FILE_BYTES],
      [path.join(SPRITE_DIR, 'boss-fire-ogre-lvl2-attack.gif'), FILE_BYTES],
      [CATALOG_PATH, renderMonsterCatalogSource(expectedEntries)],
      [NAMES_PATH, renderMonsterNameSource(expectedEntries.map((entry) => entry.name))],
    ]);
    expect(unlink.mock.calls).toEqual([
      [path.join(SPRITE_DIR, 'fire-ogre-lvl2-idle.gif')],
      [path.join(SPRITE_DIR, 'fire-ogre-lvl2-attack.gif')],
    ]);
    expect(body.entry).toEqual({
      name: 'Fire Ogre',
      level: 2,
      isBoss: true,
      sprite: {
        idle: '/monster/boss-fire-ogre-lvl2-idle.gif',
        attack: '/monster/boss-fire-ogre-lvl2-attack.gif',
      },
    });
  });

  it('moves both sprites to the new level when only the level changes', async () => {
    const response = await patch({ ...fireOgreEdit, nextLevel: 3 });
    const body = (await response.json()) as { entry: unknown };

    const expectedEntries = buildMonsterCatalogEntries(
      [...SEED_FILES, 'fire-ogre-lvl3-idle.gif', 'fire-ogre-lvl3-attack.gif'].sort(),
    );
    expect(response.status).toBe(200);
    expect(writeFile.mock.calls).toEqual([
      [path.join(SPRITE_DIR, 'fire-ogre-lvl3-idle.gif'), FILE_BYTES],
      [path.join(SPRITE_DIR, 'fire-ogre-lvl3-attack.gif'), FILE_BYTES],
      [CATALOG_PATH, renderMonsterCatalogSource(expectedEntries)],
      [NAMES_PATH, renderMonsterNameSource(expectedEntries.map((entry) => entry.name))],
    ]);
    expect(unlink.mock.calls).toEqual([
      [path.join(SPRITE_DIR, 'fire-ogre-lvl2-idle.gif')],
      [path.join(SPRITE_DIR, 'fire-ogre-lvl2-attack.gif')],
    ]);
    expect(body.entry).toEqual({
      name: 'Fire Ogre',
      level: 3,
      isBoss: false,
      sprite: { idle: '/monster/fire-ogre-lvl3-idle.gif', attack: '/monster/fire-ogre-lvl3-attack.gif' },
    });
  });
});
