import { anonymousRequest, AUTHORIZED_HEADERS, TEST_DEV_TOOLS_PASSWORD } from '@/lib/dev-tools/access.test-utils';
// jsdom (this project's default test environment) has no Web Request/Response/fetch globals,
// which next/server's route handlers need. Polyfill from undici (already a transitive Next.js
// dependency) before importing the route under test.
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

import { DECORATION_LAYOUTS_CONFIG_PATH, DECORATION_SCENARIO_KEYS } from '@/modules/map';
import type { DecorationLayoutsConfig } from '@/modules/map';

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  rm: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

// Also `require`d, not `import`ed: './route' imports `next/server`, which reads the global
// `Request` at module-evaluation time, so it must load after the polyfill above runs, not
// hoisted above it the way an `import` declaration would be.
import type { writeFile as WriteFileFn } from 'fs/promises';
import type { POST as PostFn } from './route';

const { writeFile } = require('fs/promises') as { writeFile: typeof WriteFileFn };
const { POST } = require('./route') as { POST: typeof PostFn };
/* eslint-enable @typescript-eslint/no-require-imports */

const mockWriteFile = writeFile as jest.Mock;

function buildValidConfig(): DecorationLayoutsConfig {
  const config = {} as Record<string, unknown>;
  for (const key of DECORATION_SCENARIO_KEYS) {
    config[key] = [{ id: `${key}-default`, name: 'Default', instances: [] }];
  }
  return config as DecorationLayoutsConfig;
}

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/tile-decoration-editor/layouts', {
    headers: AUTHORIZED_HEADERS,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

process.env.DEV_TOOLS_PASSWORD = TEST_DEV_TOOLS_PASSWORD;

describe('POST /api/tile-decoration-editor/layouts', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('writes the config to DECORATION_LAYOUTS_CONFIG_PATH and returns 200 for a complete body', async () => {
    mockWriteFile.mockResolvedValue(undefined);
    const config = buildValidConfig();

    const response = await POST(buildRequest({ config }));
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ ok: true }));
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(DECORATION_LAYOUTS_CONFIG_PATH),
      `${JSON.stringify(config, null, 2)}\n`,
    );
  });

  it('returns 400 and never writes when a scenario key is missing', async () => {
    const config = buildValidConfig() as Record<string, unknown>;
    delete config['monster-cleared'];

    const response = await POST(buildRequest({ config }));

    expect(response.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('returns 400 and never writes when a scenario key has an empty layout array', async () => {
    const config = buildValidConfig() as Record<string, unknown>;
    config['monster-cleared'] = [];

    const response = await POST(buildRequest({ config }));

    expect(response.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('returns 400 and never writes when the body has no config at all', async () => {
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('returns 401 without a token and never writes', async () => {
    const response = await POST(anonymousRequest());

    expect(response.status).toBe(401);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });
});
