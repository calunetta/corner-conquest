// jsdom has no Web Request/Response globals; polyfill them before importing next/server (same as the route tests).
/* eslint-disable @typescript-eslint/no-require-imports */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
const { Headers, Request, Response, fetch } = require('undici');
Object.assign(globalThis, { Headers, Request, Response, fetch });

const { DELETE, GET, POST } = require('./route') as { DELETE: () => Promise<Response>; GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
const { DEV_TOOLS_COOKIE } = require('@/lib/dev-tools/session') as { DEV_TOOLS_COOKIE: string };
/* eslint-enable @typescript-eslint/no-require-imports */

import { AUTHORIZED_HEADERS, TEST_DEV_TOOLS_PASSWORD } from '@/lib/dev-tools/access.test-utils';

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/dev-tools/session', { method: 'POST', body: JSON.stringify(body) }));

describe('/api/dev-tools/session', () => {
  const originalPassword = process.env.DEV_TOOLS_PASSWORD;

  beforeEach(() => {
    process.env.DEV_TOOLS_PASSWORD = TEST_DEV_TOOLS_PASSWORD;
  });

  afterEach(() => {
    process.env.DEV_TOOLS_PASSWORD = originalPassword;
  });

  it('sets an httpOnly, strict cookie that is not the password itself', async () => {
    const response = await post({ password: TEST_DEV_TOOLS_PASSWORD });

    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${DEV_TOOLS_COOKIE}=`);
    expect(cookie).not.toContain(TEST_DEV_TOOLS_PASSWORD);
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(cookie.toLowerCase()).toContain('samesite=strict');
  });

  it('returns 403 with an error and sets no cookie for a wrong password', async () => {
    const response = await post({ password: 'wrong-password-that-is-long' });

    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.json()).toEqual({ error: 'Wrong password.' });
  });

  it('returns 403 when the body has no password', async () => {
    expect((await post({})).status).toBe(403);
  });

  it('returns 503 when no password is configured', async () => {
    delete process.env.DEV_TOOLS_PASSWORD;

    expect((await post({ password: TEST_DEV_TOOLS_PASSWORD })).status).toBe(503);
  });

  it('reports unlocked for a browser that holds the session cookie', async () => {
    const response = await GET(new Request('http://localhost/api/dev-tools/session', { headers: AUTHORIZED_HEADERS }));

    expect(await response.json()).toEqual({ configured: true, unlocked: true });
  });

  it('reports locked for a browser without the cookie', async () => {
    const response = await GET(new Request('http://localhost/api/dev-tools/session'));

    expect(await response.json()).toEqual({ configured: true, unlocked: false });
  });

  it('clears the cookie on DELETE', async () => {
    const response = await DELETE();

    expect(response.headers.get('set-cookie')).toMatch(/cc_dev_tools=;.*Max-Age=0/i);
  });
});
