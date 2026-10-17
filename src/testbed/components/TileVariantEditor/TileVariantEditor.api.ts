// Calls to the dev-only tile-variant routes. Each returns a message the editor shows as its status.
import type { TileVariant, TileVariantsConfig, TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';

/** The saved config and the sha the next save must send back. */
export interface ConfigSnapshot {
  config: TileVariantsConfig;
  sha: string;
}

export type ConfigResult =
  | { ok: true; value: ConfigSnapshot & { pullRequestUrl: string | null } }
  /** `newer` is set on a conflict: the live config moved on, so the editor reloads it and the change was not saved. */
  | { ok: false; message: string; newer?: ConfigSnapshot };

export type ApiResult<T> = { ok: true; value: T } | { ok: false; message: string };

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `Request failed (${response.status}).`;
}

async function readConfigResult(response: Response): Promise<ConfigResult> {
  if (response.ok) {
    return { ok: true, value: (await response.json()) as ConfigSnapshot & { pullRequestUrl: string | null } };
  }
  const message = await readError(response);
  if (response.status !== 409) return { ok: false, message };
  return { ok: false, message, newer: (await response.json()) as ConfigSnapshot };
}

export async function loadConfig(): Promise<ApiResult<ConfigSnapshot>> {
  const response = await fetch('/api/tile-variants');
  if (!response.ok) return { ok: false, message: await readError(response) };
  return { ok: true, value: (await response.json()) as ConfigSnapshot };
}

export function saveVariant(variant: TileVariant, isNew: boolean, baseSha: string): Promise<ConfigResult> {
  return fetch('/api/tile-variants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant, isNew, baseSha }),
  }).then(readConfigResult);
}

export function deleteVariant(id: string, baseSha: string): Promise<ConfigResult> {
  const query = new URLSearchParams({ id, baseSha });
  return fetch(`/api/tile-variants?${query}`, { method: 'DELETE' }).then(readConfigResult);
}

export async function uploadImage(type: TileVariantType, file: File): Promise<ApiResult<{ imagePath: string }>> {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  const response = await fetch('/api/tile-variants/images', { method: 'POST', body: form });
  if (!response.ok) return { ok: false, message: await readError(response) };
  return { ok: true, value: (await response.json()) as { imagePath: string } };
}

export async function deleteImage(imagePath: string): Promise<ApiResult<null>> {
  const response = await fetch(`/api/tile-variants/images?image=${encodeURIComponent(imagePath)}`, { method: 'DELETE' });
  return response.ok ? { ok: true, value: null } : { ok: false, message: await readError(response) };
}
