// jsdom has no Web Request/Response globals; polyfill before importing the route (see the
// tile-decoration-editor route tests for why this uses require).
/* eslint-disable @typescript-eslint/no-require-imports */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
const { Headers, Request, Response, fetch } = require('undici');
Object.assign(globalThis, { Headers, Request, Response, fetch });

import type { writeFile as WriteFileFn } from 'fs/promises';
import type { POST as PostFn } from './route';

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
}));

const { writeFile } = require('fs/promises') as { writeFile: jest.Mock & typeof WriteFileFn };
const { POST } = require('./route') as { POST: typeof PostFn };
/* eslint-enable @typescript-eslint/no-require-imports */

const validTiming = {
  fadeStartMs: 400,
  fadeMs: 800,
  scale: 1.2,
  offsetXPct: 0,
  offsetYPct: 0,
  revealDelayMs: 200,
  revealFadeMs: 600,
};

const postTiming = (body: unknown) =>
  POST(new Request('http://localhost/api/tile-fog-timing', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/tile-fog-timing', () => {
  beforeEach(() => {
    writeFile.mockClear();
  });

  it('writes the fog timing config as JSON', async () => {
    const response = await postTiming({ timing: validTiming });

    expect(response.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(1);
    const [filePath, contents] = writeFile.mock.calls[0] as [string, string];
    expect(filePath).toMatch(/TileFog\/fog-timing\.config\.json$/);
    expect(JSON.parse(contents)).toEqual(validTiming);
  });

  it('rejects a value outside its range without writing', async () => {
    const response = await postTiming({ timing: { ...validTiming, scale: 9 } });

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects a missing field without writing', async () => {
    const incomplete: Partial<typeof validTiming> = { ...validTiming };
    delete incomplete.fadeMs;
    const response = await postTiming({ timing: incomplete });

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
