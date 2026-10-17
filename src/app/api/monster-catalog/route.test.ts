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
}));

import path from 'path';
import type { mkdir as MkdirFn, readdir as ReaddirFn, writeFile as WriteFileFn } from 'fs/promises';
import type { POST as PostFn } from './route';
import {
  buildMonsterCatalogEntries,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from '@/modules/game-rules/monster-catalog-generator';

const { readdir, mkdir, writeFile } = require('fs/promises') as {
  readdir: jest.Mock & typeof ReaddirFn;
  mkdir: jest.Mock & typeof MkdirFn;
  writeFile: jest.Mock & typeof WriteFileFn;
};
const { POST } = require('./route') as { POST: typeof PostFn };
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
