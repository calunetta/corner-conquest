import { NextResponse } from 'next/server';
import { configuredDevToolsPassword, DEV_TOOLS_COOKIE, isDevToolsSessionValue, readCookie } from './session';

export { DEV_TOOLS_COOKIE } from './session';

function jsonError(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Guard for every dev-tool API route. Returns the error response to send back, or null when the request may proceed.
 * 503: no password is set on the server. 401: this browser has not entered the password.
 */
export function denyUnlessDevToolsAccess(request: Request): Response | null {
  if (!configuredDevToolsPassword()) {
    return jsonError('Dev tools are not set up on this server (DEV_TOOLS_PASSWORD is missing or too short).', 503);
  }

  const session = readCookie(request.headers.get('cookie'), DEV_TOOLS_COOKIE);
  if (!isDevToolsSessionValue(session)) return jsonError('Dev tools password required.', 401);

  return null;
}
