import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** Cookie that marks a browser as unlocked. Its value is derived from the password, never the password itself. */
export const DEV_TOOLS_COOKIE = 'cc_dev_tools';

/** Shortest password accepted. A shorter one counts as "not set up", so a weak password never unlocks the tools. */
const MIN_PASSWORD_LENGTH = 12;

/** Fixed message that keys the session HMAC. Changing it signs everyone out. */
const SESSION_MESSAGE = 'dev-tools-session-v1';

/** The server-side password, from DEV_TOOLS_PASSWORD. Null when unset or too short. */
export function configuredDevToolsPassword(): string | null {
  const password = process.env.DEV_TOOLS_PASSWORD;
  return password && password.length >= MIN_PASSWORD_LENGTH ? password : null;
}

/** The cookie value that an unlocked browser holds for this password. */
export function sessionValueFor(password: string): string {
  return createHmac('sha256', password).update(SESSION_MESSAGE).digest('hex');
}

/** Compares two strings in constant time. Both are hashed first, so the lengths always match. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

/** True when the typed password is the configured one. */
export function passwordMatches(candidate: string): boolean {
  const expected = configuredDevToolsPassword();
  return expected !== null && safeEqual(candidate, expected);
}

/** True when a cookie value is the session value of the configured password. */
export function isDevToolsSessionValue(value: string | null | undefined): boolean {
  const password = configuredDevToolsPassword();
  return password !== null && typeof value === 'string' && safeEqual(value, sessionValueFor(password));
}

/** Reads one cookie from a raw `Cookie` header. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;

  const pair = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}
