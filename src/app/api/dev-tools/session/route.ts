import { NextResponse } from 'next/server';
import {
  configuredDevToolsPassword,
  DEV_TOOLS_COOKIE,
  isDevToolsSessionValue,
  passwordMatches,
  readCookie,
  sessionValueFor,
} from '@/lib/dev-tools/session';

const SESSION_SECONDS = 8 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

/** Reports whether a password is set on the server and whether this browser is unlocked. */
export async function GET(request: Request): Promise<Response> {
  const session = readCookie(request.headers.get('cookie'), DEV_TOOLS_COOKIE);
  return NextResponse.json({
    configured: configuredDevToolsPassword() !== null,
    unlocked: isDevToolsSessionValue(session),
  });
}

/** Body `{ "password": "..." }`. On success, unlocks this browser for eight hours. */
export async function POST(request: Request): Promise<Response> {
  const password = configuredDevToolsPassword();
  if (!password) {
    return NextResponse.json({ error: 'Dev tools are not set up on this server.' }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const typed = typeof body === 'object' && body !== null && 'password' in body ? body.password : null;
  if (typeof typed !== 'string' || !passwordMatches(typed)) {
    return NextResponse.json({ error: 'Wrong password.' }, { status: 403 });
  }

  const response = NextResponse.json({ unlocked: true });
  response.cookies.set(DEV_TOOLS_COOKIE, sessionValueFor(password), cookieOptions(SESSION_SECONDS));
  return response;
}

/** Locks this browser again. */
export async function DELETE(): Promise<Response> {
  const response = NextResponse.json({ unlocked: false });
  response.cookies.set(DEV_TOOLS_COOKIE, '', cookieOptions(0));
  return response;
}
