import { anonymousRequest, authorizedRequest, TEST_DEV_TOOLS_PASSWORD } from '@/lib/dev-tools/access.test-utils';
// jsdom (this project's default test environment) has no Web Request/Response/fetch globals,
// which next/server's route handlers need even for a GET with no request body. Polyfill from
// undici (already a transitive Next.js dependency) before importing the route under test.
// Plain `require` here, not `import`: TS/Babel hoist all `import` declarations above every other
// statement (including each other's side-effecting code), so an `import`-based polyfill would run
// too late relative to the route import it's meant to precede.
/* eslint-disable @typescript-eslint/no-require-imports -- see comment above */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
const { Headers, Request, Response, fetch } = require('undici');
Object.assign(globalThis, { Headers, Request, Response, fetch });

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
}));

// Also `require`d, not `import`ed: './route' imports `next/server`, which reads the global
// `Request` at module-evaluation time, so it must load after the polyfill above runs, not
// hoisted above it the way an `import` declaration would be.
import type { readdir as ReaddirFn } from 'fs/promises';
import type { GET as GetFn } from './route';

const { readdir } = require('fs/promises') as { readdir: typeof ReaddirFn };
const { GET } = require('./route') as { GET: typeof GetFn };
/* eslint-enable @typescript-eslint/no-require-imports */

const mockReaddir = readdir as jest.Mock;

process.env.DEV_TOOLS_PASSWORD = TEST_DEV_TOOLS_PASSWORD;

describe('GET /api/tile-decoration-editor/images', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the discovered files, filtered to image extensions and prefixed with /sprites/decorations/', async () => {
    mockReaddir.mockResolvedValue(['tree.gif', 'notes.txt', 'pine.PNG', 'icon.webp']);

    const response = await GET(authorizedRequest());
    const body = (await response.json()) as { images: string[] };

    expect(response.status).toBe(200);
    expect(body.images).toEqual([
      '/sprites/decorations/tree.gif',
      '/sprites/decorations/pine.PNG',
      '/sprites/decorations/icon.webp',
    ]);
  });

  it('returns an empty list when the directory has no files', async () => {
    mockReaddir.mockResolvedValue([]);

    const response = await GET(authorizedRequest());
    const body = (await response.json()) as { images: string[] };

    expect(response.status).toBe(200);
    expect(body.images).toEqual([]);
  });

  it('returns 401 without a token and never reads the filesystem', async () => {
    const response = await GET(anonymousRequest());

    expect(response.status).toBe(401);
    expect(mockReaddir).not.toHaveBeenCalled();
  });
});
