// Calls to the dev-only fog routes from the testbed lab. Each returns a message for the lab's status line.
import type { FogTiming, FogVariant } from './TileFog.config';

export type ApiResult<T> = { ok: true; value: T } | { ok: false; message: string };

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `Request failed (${response.status}).`;
}

export interface SavedTiming {
  timing: FogTiming;
  /** Blob sha of the file as loaded; send it back with the next save. */
  sha: string;
}

export async function loadTimingDefaults(): Promise<ApiResult<SavedTiming>> {
  const response = await fetch('/api/tile-fog-timing');
  if (!response.ok) return { ok: false, message: await readError(response) };
  return { ok: true, value: (await response.json()) as SavedTiming };
}

export type SaveTimingResult =
  /** `pullRequestUrl` is null for a local save. */
  | { ok: true; pullRequestUrl: string | null }
  /** The live copy moved on. `newer` is the version to reload; the lab's own edits were not saved. */
  | { ok: false; conflict: true; message: string; newer: SavedTiming | null }
  | { ok: false; conflict: false; message: string };

/** Saves timing with the sha the lab loaded. */
export async function saveTimingDefaults(timing: FogTiming, baseSha: string): Promise<SaveTimingResult> {
  const response = await fetch('/api/tile-fog-timing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timing, baseSha }),
  });

  if (response.status === 409) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      currentContent?: string | null;
      currentSha?: string | null;
    };
    const newer =
      body.currentContent && body.currentSha
        ? { timing: JSON.parse(body.currentContent) as FogTiming, sha: body.currentSha }
        : null;
    return { ok: false, conflict: true, message: body.error ?? 'The timing changed on the live branch.', newer };
  }
  if (!response.ok) return { ok: false, conflict: false, message: await readError(response) };

  const body = (await response.json()) as { result?: { pullRequest?: { url?: string } } };
  return { ok: true, pullRequestUrl: body.result?.pullRequest?.url || null };
}

export async function applyFrameDelay(id: string, frameDelayMs: number): Promise<ApiResult<FogVariant>> {
  const response = await fetch('/api/tile-fog-variants/speed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, frameDelayMs }),
  });
  if (!response.ok) return { ok: false, message: await readError(response) };
  const { variant } = (await response.json()) as { variant: FogVariant };
  return { ok: true, value: variant };
}

export async function uploadVariant(form: FormData): Promise<ApiResult<FogVariant>> {
  const response = await fetch('/api/tile-fog-variants', { method: 'POST', body: form });
  if (!response.ok) return { ok: false, message: await readError(response) };
  const { variant } = (await response.json()) as { variant: FogVariant };
  return { ok: true, value: variant };
}
