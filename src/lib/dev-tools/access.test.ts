// jsdom has no Web Request/Response globals; polyfill them before importing next/server (same as the route tests).
/* eslint-disable @typescript-eslint/no-require-imports */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
const { Headers, Request, Response, fetch } = require('undici');
Object.assign(globalThis, { Headers, Request, Response, fetch });

const { denyUnlessDevToolsAccess } = require('./access') as typeof import('./access');
/* eslint-enable @typescript-eslint/no-require-imports */

import { AUTHORIZED_HEADERS, TEST_DEV_TOOLS_PASSWORD } from './access.test-utils';

const request = (headers: Record<string, string> = {}) => new Request('http://localhost/api/x', { headers });

describe('denyUnlessDevToolsAccess', () => {
  const originalPassword = process.env.DEV_TOOLS_PASSWORD;

  beforeEach(() => {
    process.env.DEV_TOOLS_PASSWORD = TEST_DEV_TOOLS_PASSWORD;
  });

  afterEach(() => {
    process.env.DEV_TOOLS_PASSWORD = originalPassword;
  });

  it('lets a browser through once it holds the session cookie', () => {
    expect(denyUnlessDevToolsAccess(request(AUTHORIZED_HEADERS))).toBeNull();
  });

  it('returns 401 with a message when the browser has not logged in', async () => {
    const response = denyUnlessDevToolsAccess(request()) as Response;

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Dev tools password required.' });
  });

  it('returns 401 for a cookie that is not the session value of the password', () => {
    expect(denyUnlessDevToolsAccess(request({ cookie: 'cc_dev_tools=guessed' }))?.status).toBe(401);
  });

  it('returns 503 when DEV_TOOLS_PASSWORD is not set, even with a valid-looking cookie', async () => {
    delete process.env.DEV_TOOLS_PASSWORD;

    const response = denyUnlessDevToolsAccess(request(AUTHORIZED_HEADERS)) as Response;

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/not set up/);
  });

  it('treats a password shorter than 12 characters as not set up', () => {
    process.env.DEV_TOOLS_PASSWORD = 'short';

    expect(denyUnlessDevToolsAccess(request(AUTHORIZED_HEADERS))?.status).toBe(503);
  });
});
