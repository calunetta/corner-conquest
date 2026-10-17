// jsdom has no Web Request/Response globals; polyfill them before importing next/server (same as the route tests).
/* eslint-disable @typescript-eslint/no-require-imports */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
const { Headers, Request, Response, fetch } = require('undici');
Object.assign(globalThis, { Headers, Request, Response, fetch });

import type { GET as GetFn, POST as PostFn } from './route';
import { DEFAULT_TILE_VARIANTS_CONFIG } from '@/modules/map/components/TileVariants/TileVariants.config';
import { gitBlobSha } from '@/lib/dev-tools/save-file';
import { AUTHORIZED_HEADERS, TEST_DEV_TOOLS_PASSWORD } from '@/lib/dev-tools/access.test-utils';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  rm: jest.fn(),
  readdir: jest.fn(),
}));

const { readFile, writeFile } = require('fs/promises') as { readFile: jest.Mock; writeFile: jest.Mock };
const { GET, POST } = require('./route') as { GET: typeof GetFn; POST: typeof PostFn };
/* eslint-enable @typescript-eslint/no-require-imports */

const savedText = `${JSON.stringify(DEFAULT_TILE_VARIANTS_CONFIG, null, 2)}\n`;
const savedSha = gitBlobSha(savedText);
const newVariant = { ...DEFAULT_TILE_VARIANTS_CONFIG.variants[0], id: 'new-one', name: 'New one' };

const postVariant = (baseSha: string) =>
  POST(
    new Request('http://localhost/api/tile-variants', {
      method: 'POST',
      headers: AUTHORIZED_HEADERS,
      body: JSON.stringify({ variant: newVariant, isNew: true, baseSha }),
    }),
  );

describe('/api/tile-variants', () => {
  const originalPassword = process.env.DEV_TOOLS_PASSWORD;

  beforeEach(() => {
    process.env.DEV_TOOLS_PASSWORD = TEST_DEV_TOOLS_PASSWORD;
    readFile.mockReset().mockResolvedValue(savedText);
    writeFile.mockReset();
  });

  afterEach(() => {
    process.env.DEV_TOOLS_PASSWORD = originalPassword;
  });

  it('GET returns the config with the sha the next save must send', async () => {
    const response = await GET(new Request('http://localhost/api/tile-variants', { headers: AUTHORIZED_HEADERS }));

    expect(await response.json()).toEqual({ config: DEFAULT_TILE_VARIANTS_CONFIG, sha: savedSha });
  });

  it('saves a new variant when the sha matches', async () => {
    const response = await postVariant(savedSha);

    expect(response.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(1);
    const written = JSON.parse(writeFile.mock.calls[0][1] as string);
    expect(written.variants).toHaveLength(DEFAULT_TILE_VARIANTS_CONFIG.variants.length + 1);
  });

  it('refuses a change made against an older sha and returns the newer config', async () => {
    const response = await postVariant('stale-sha');

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: expect.stringContaining('changed since you loaded'),
      config: DEFAULT_TILE_VARIANTS_CONFIG,
      sha: savedSha,
    });
    expect(writeFile).not.toHaveBeenCalled();
  });
});
