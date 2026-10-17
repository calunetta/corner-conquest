// Calls to the dev-only fog routes from the testbed lab. Each returns a message for the lab's status line.
import type { FogTiming, FogVariant } from './TileFog.config';

export type ApiResult<T> = { ok: true; value: T } | { ok: false; message: string };

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `Request failed (${response.status}).`;
}

export async function saveTimingDefaults(timing: FogTiming): Promise<ApiResult<null>> {
  const response = await fetch('/api/tile-fog-timing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timing }),
  });
  return response.ok ? { ok: true, value: null } : { ok: false, message: await readError(response) };
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
