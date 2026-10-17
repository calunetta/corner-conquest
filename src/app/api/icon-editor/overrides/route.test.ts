// jsdom (this project's default test environment) has no Web Request/Response/fetch globals,
// which next/server needs. Polyfill from undici before importing the route under test. Plain
// `require` here, not `import`: imports are hoisted above the polyfill, and './route' reads the
// global Request when it loads.
/* eslint-disable @typescript-eslint/no-require-imports -- see comment above */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
const { Headers, Request, Response, fetch } = require('undici');
Object.assign(globalThis, { Headers, Request, Response, fetch });

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
}));

import type { writeFile as WriteFileFn } from 'fs/promises';
import type { POST as PostFn } from './route';

const { writeFile } = require('fs/promises') as { writeFile: jest.Mock & typeof WriteFileFn };
const { POST } = require('./route') as { POST: typeof PostFn };
/* eslint-enable @typescript-eslint/no-require-imports */

// @types/node types NODE_ENV as readonly; Object.defineProperty bypasses that for this test only.
function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true });
}

function postOverrides(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/icon-editor/overrides', { method: 'POST', body: JSON.stringify(body) }));
}

describe('POST /api/icon-editor/overrides', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    jest.clearAllMocks();
  });

  it('writes the overrides to the config file as pretty-printed JSON and returns { ok: true }', async () => {
    const overrides = {
      swords: { rotation: 90, size: 150 },
      'icon-fight': { src: '/sprites/icon-overrides/icon-fight-1700000000000.png' },
    };

    const response = await postOverrides({ overrides });
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(writeFile).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenContents] = writeFile.mock.calls[0] as [string, string];
    expect(writtenPath).toMatch(/src[\\/]modules[\\/]icons[\\/]icon-overrides\.config\.json$/);
    expect(writtenContents).toBe(JSON.stringify(overrides, null, 2));
  });

  it('accepts an empty overrides object and writes it as "{}"', async () => {
    const response = await postOverrides({ overrides: {} });

    expect(response.status).toBe(200);
    const [, writtenContents] = writeFile.mock.calls[0] as [string, string];
    expect(writtenContents).toBe('{}');
  });

  it.each([
    ['only rotation', { rotation: 0 }],
    ['only size, at the lower bound', { size: 25 }],
    ['only src', { src: '/sprites/icon-overrides/x.png' }],
    ['an override with no fields', {}],
  ])('accepts an entry with %s', async (_label, entry) => {
    const response = await postOverrides({ overrides: { swords: entry } });

    expect(response.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a missing overrides key', {}],
    ['overrides set to null', { overrides: null }],
    ['overrides set to a string', { overrides: 'swords' }],
    ['overrides set to a number', { overrides: 3 }],
  ])('rejects %s with 400 and writes nothing', async (_label, body) => {
    const response = await postOverrides(body);
    const error = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(error.error).toBe('Invalid icon overrides payload.');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it.each([
    ['an entry that is null', { swords: null }],
    ['an entry that is a number', { swords: 5 }],
    ['an entry that is a string', { swords: 'rotate' }],
    ['a rotation that is a string', { swords: { rotation: '90' } }],
    ['a size that is a string', { swords: { size: '100' } }],
    ['a src that is a number', { swords: { src: 5 } }],
    ['one invalid entry among valid ones', { swords: { rotation: 90 }, info: { size: 'big' } }],
  ])('rejects %s with 400 and writes nothing', async (_label, overrides) => {
    const response = await postOverrides({ overrides });

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects an entry with an unknown key with 400 and writes nothing', async () => {
    const response = await postOverrides({ overrides: { swords: { rotation: 90, colour: 'red' } } });

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects an array of overrides with 400 and writes nothing', async () => {
    const response = await postOverrides({ overrides: [{ rotation: 90 }] });

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('returns 400 instead of throwing on a malformed JSON body', async () => {
    const request = new Request('http://localhost/api/icon-editor/overrides', { method: 'POST', body: '{not json' });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Malformed JSON body.');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('returns 404 and writes nothing in production', async () => {
    setNodeEnv('production');

    const response = await postOverrides({ overrides: { swords: { rotation: 90 } } });

    expect(response.status).toBe(404);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
