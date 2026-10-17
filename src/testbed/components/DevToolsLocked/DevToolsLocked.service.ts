/** Unlocks this browser with the dev tools password. Resolves with an error message, or null on success. */
export async function unlockDevTools(password: string): Promise<string | null> {
  const response = await fetch('/api/dev-tools/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (response.ok) return null;

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? 'Could not unlock the dev tools.';
}
