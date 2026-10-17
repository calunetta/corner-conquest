import { anonymousRequest, authorizedRequest, TEST_DEV_TOOLS_PASSWORD } from '@/lib/dev-tools/access.test-utils';
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
  readdir: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

import type { mkdir as MkdirFn, readdir as ReaddirFn, writeFile as WriteFileFn } from 'fs/promises';
import type { GET as GetFn, POST as PostFn } from './route';

const { readdir, mkdir, writeFile } = require('fs/promises') as {
  readdir: jest.Mock & typeof ReaddirFn;
  mkdir: jest.Mock & typeof MkdirFn;
  writeFile: jest.Mock & typeof WriteFileFn;
};
const { GET, POST } = require('./route') as { GET: typeof GetFn; POST: typeof PostFn };
/* eslint-enable @typescript-eslint/no-require-imports */

const FIXED_NOW = 1700000000000;

// The route only calls request.formData().get(). undici's multipart parser cannot run under jsdom
// (its byte-type checks fail across the realm boundary), so the test hands the route a request
// whose formData() resolves to the entries directly. The File is undici's, the same class the
// route's `instanceof File` check resolves to in this environment.
function postUpload(fields: { iconId?: string; file?: File }): Promise<Response> {
  const entries = new Map<string, FormDataEntryValue>();
  if (fields.iconId !== undefined) entries.set('iconId', fields.iconId);
  if (fields.file !== undefined) entries.set('file', fields.file);
  const request = { ...authorizedRequest(), formData: async () => entries as unknown as FormData } as unknown as Request;
  return POST(request);
}

// jsdom's File has no arrayBuffer(), which the route reads; add it so the route can consume the bytes.
function pngFile(name: string): File {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const file = new File([bytes], name, { type: 'image/png' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  return file;
}

process.env.DEV_TOOLS_PASSWORD = TEST_DEV_TOOLS_PASSWORD;

describe('GET /api/icon-editor/uploads', () => {

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns only image files, prefixed with /sprites/icon-overrides/, keeping the directory listing order', async () => {
    readdir.mockResolvedValue(['a.png', 'b.JPG', 'c.jpeg', 'd.gif', 'e.webp', 'f.svg', 'g.txt', '.DS_Store', 'h.PNG']);

    const response = await GET(authorizedRequest());
    const body = (await response.json()) as { images: string[] };

    expect(response.status).toBe(200);
    expect(body.images).toEqual([
      '/sprites/icon-overrides/a.png',
      '/sprites/icon-overrides/b.JPG',
      '/sprites/icon-overrides/c.jpeg',
      '/sprites/icon-overrides/d.gif',
      '/sprites/icon-overrides/e.webp',
      '/sprites/icon-overrides/h.PNG',
    ]);
  });

  it('reads the icon-overrides folder under public/', async () => {
    readdir.mockResolvedValue([]);

    await GET(authorizedRequest());

    expect(readdir).toHaveBeenCalledWith(expect.stringMatching(/public[\\/]sprites[\\/]icon-overrides$/));
  });

  it('returns an empty list when the folder has no image files', async () => {
    readdir.mockResolvedValue(['notes.txt']);

    const response = await GET(authorizedRequest());
    const body = (await response.json()) as { images: string[] };

    expect(response.status).toBe(200);
    expect(body.images).toEqual([]);
  });

  it('returns 401 without a token and never reads the filesystem', async () => {
    const response = await GET(anonymousRequest());

    expect(response.status).toBe(401);
    expect(readdir).not.toHaveBeenCalled();
  });

  it('returns an empty list instead of throwing when the folder does not exist yet (fresh checkout)', async () => {
    readdir.mockRejectedValue(Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }));

    const response = await GET(authorizedRequest());
    const body = (await response.json()) as { images: string[] };

    expect(response.status).toBe(200);
    expect(body.images).toEqual([]);
  });
});

describe('POST /api/icon-editor/uploads', () => {

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('writes a valid upload under <iconId>-<timestamp>.<ext> and returns its public path', async () => {
    const response = await postUpload({ iconId: 'swords', file: pngFile('my-sword.png') });
    const body = (await response.json()) as { path: string };

    expect(response.status).toBe(200);
    expect(body.path).toBe(`/sprites/icon-overrides/swords-${FIXED_NOW}.png`);
    expect(mkdir).toHaveBeenCalledWith(expect.stringMatching(/public[\\/]sprites[\\/]icon-overrides$/), { recursive: true });
    expect(writeFile).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenBytes] = writeFile.mock.calls[0] as [string, Buffer];
    expect(writtenPath).toMatch(new RegExp(`public[\\\\/]sprites[\\\\/]icon-overrides[\\\\/]swords-${FIXED_NOW}\\.png$`));
    expect(Buffer.from(writtenBytes)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('lower-cases the extension in the stored filename', async () => {
    const response = await postUpload({ iconId: 'zoom-in', file: pngFile('Shot.PNG') });
    const body = (await response.json()) as { path: string };

    expect(body.path).toBe(`/sprites/icon-overrides/zoom-in-${FIXED_NOW}.png`);
  });

  it.each(['.png', '.jpg', '.jpeg', '.gif', '.webp'])('accepts the %s extension', async (extension) => {
    const response = await postUpload({ iconId: 'swords', file: pngFile(`icon${extension}`) });

    expect(response.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no iconId', { file: pngFile('a.png') }],
    ['an empty iconId', { iconId: '', file: pngFile('a.png') }],
    ['no file', { iconId: 'swords' }],
  ])('rejects %s with 400 and writes nothing', async (_label, fields) => {
    const response = await postUpload(fields);

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it.each(['a.svg', 'a.txt', 'a.exe', 'noextension'])('rejects %s with 400 and writes nothing', async (name) => {
    const response = await postUpload({ iconId: 'swords', file: pngFile(name) });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Unsupported file extension/);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('returns 401 without a token and writes nothing', async () => {
    const response = await POST(anonymousRequest());

    expect(response.status).toBe(401);
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects an iconId with path segments with 400 and writes nothing', async () => {
    const response = await postUpload({ iconId: '../../evil', file: pngFile('a.png') });

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
