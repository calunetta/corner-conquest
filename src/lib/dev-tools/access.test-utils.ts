import { DEV_TOOLS_COOKIE, sessionValueFor } from './session';

/** Password the dev-tool route tests configure as DEV_TOOLS_PASSWORD. Never a real secret. */
export const TEST_DEV_TOOLS_PASSWORD = 'test-dev-tools-password';

/** Headers for a real Request, e.g. `new Request(url, { headers: AUTHORIZED_HEADERS })`: a browser that has entered the password. */
export const AUTHORIZED_HEADERS = {
  cookie: `${DEV_TOOLS_COOKIE}=${sessionValueFor(TEST_DEV_TOOLS_PASSWORD)}`,
};

/**
 * A request from an unlocked browser, for handlers that only read headers.
 * A stand-in object, because jsdom has no Web Request global in these tests.
 */
export function authorizedRequest(): Request {
  return headerStub(AUTHORIZED_HEADERS.cookie);
}

/** A request with no session cookie, to check the route refuses it. */
export function anonymousRequest(): Request {
  return headerStub(null);
}

function headerStub(cookie: string | null): Request {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === 'cookie' ? cookie : null) },
  } as unknown as Request;
}
