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

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('./regenerate-source', () => ({
  regenerateIslandTileSlotsSource: jest.fn(),
}));

import type { readFile as ReadFileFn, writeFile as WriteFileFn } from 'fs/promises';
import type { POST as PostFn } from './route';
import type { regenerateIslandTileSlotsSource as RegenerateFn } from './regenerate-source';

const { readFile, writeFile } = require('fs/promises') as { readFile: typeof ReadFileFn; writeFile: typeof WriteFileFn };
const { POST } = require('./route') as { POST: typeof PostFn };
const { regenerateIslandTileSlotsSource } = require('./regenerate-source') as {
  regenerateIslandTileSlotsSource: typeof RegenerateFn;
};
/* eslint-enable @typescript-eslint/no-require-imports */

import { ISLAND_TILE_SLOTS_PATH } from '@/modules/map/island-tile-slots.types';
import type { IslandTileSlotsDraft } from '@/modules/map/island-tile-slots.types';

const mockReadFile = readFile as jest.Mock;
const mockWriteFile = writeFile as jest.Mock;
const mockRegenerate = regenerateIslandTileSlotsSource as jest.Mock;

function buildValidDraft(): IslandTileSlotsDraft {
  const corner = (id: 'br' | 'tr' | 'tl' | 'bl') => ({ id, style: { top: '0%', left: '0%' } });
  return {
    occupantCornerSlots: [corner('br'), corner('tr'), corner('tl'), corner('bl')],
    boatCornerPositions: [corner('br'), corner('tr'), corner('tl'), corner('bl')],
    occupantSize: 43,
    boatSize: 42,
    specialIslandTop: '40%',
    specialIslandLeft: '50%',
    specialIslandSize: 35,
    baseCrestSize: 44,
    baseCrestMinPx: 18,
    singleResourceSlot: { top: '50%', left: '50%', size: 40 },
    dualResourceSlots: [{ top: '20%', left: '50%', size: 40 }, { top: '55%', left: '60%', size: 40 }],
    tripleResourceSlots: [
      { top: '20%', left: '45%', size: 40 },
      { top: '45%', left: '75%', size: 40 },
      { top: '55%', left: '35%', size: 40 },
    ],
    quadResourceSlots: [
      { top: '20%', left: '35%', size: 40 },
      { top: '25%', left: '70%', size: 40 },
      { top: '50%', left: '30%', size: 40 },
      { top: '60%', left: '80%', size: 40 },
    ],
    baseResourceSlots: [
      { top: '60%', left: '20%', size: 30 },
      { top: '45%', right: '-17%', size: 30 },
      { top: '15%', left: '50%', size: 30 },
    ],
  };
}

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/tile-decoration-editor/default-elements', {
    headers: AUTHORIZED_HEADERS,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

process.env.DEV_TOOLS_PASSWORD = TEST_DEV_TOOLS_PASSWORD;

describe('POST /api/tile-decoration-editor/default-elements', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without a token and never reads or writes', async () => {
    const response = await POST(anonymousRequest());

    expect(response.status).toBe(401);
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('returns 400 and never reads or writes when the body has no draft at all', async () => {
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it.each([
    'occupantCornerSlots',
    'boatCornerPositions',
    'occupantSize',
    'specialIslandTop',
    'baseCrestSize',
    'singleResourceSlot',
    'dualResourceSlots',
    'tripleResourceSlots',
    'quadResourceSlots',
    'baseResourceSlots',
  ] as const)('returns 400 and never reads or writes when %s is missing', async (missingField) => {
    const draft = buildValidDraft() as unknown as Record<string, unknown>;
    delete draft[missingField];

    const response = await POST(buildRequest({ draft }));

    expect(response.status).toBe(400);
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('returns 400 when an occupantCornerSlots entry is missing its style key', async () => {
    const draft = buildValidDraft();
    (draft.occupantCornerSlots[0] as unknown as Record<string, unknown>).style = undefined;

    const response = await POST(buildRequest({ draft }));

    expect(response.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('returns 400 when a resource slot array entry has no numeric size', async () => {
    const draft = buildValidDraft();
    (draft.dualResourceSlots[0] as unknown as Record<string, unknown>).size = 'not-a-number';

    const response = await POST(buildRequest({ draft }));

    expect(response.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('reads the real file, regenerates with the validated draft, writes the result, and returns 200', async () => {
    const draft = buildValidDraft();
    const currentSource = 'export const OCCUPANT_SIZE = 43;';
    const regeneratedSource = 'export const OCCUPANT_SIZE = 99;';
    mockReadFile.mockResolvedValue(currentSource);
    mockRegenerate.mockReturnValue(regeneratedSource);
    mockWriteFile.mockResolvedValue(undefined);

    const response = await POST(buildRequest({ draft }));
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining(ISLAND_TILE_SLOTS_PATH), 'utf-8');
    expect(mockRegenerate).toHaveBeenCalledWith(currentSource, draft);
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining(ISLAND_TILE_SLOTS_PATH), regeneratedSource);
  });
});
