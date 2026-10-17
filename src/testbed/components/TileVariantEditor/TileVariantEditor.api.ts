// Calls to the dev-only tile-variant routes. Each returns a message the editor shows as its status.
import type { TileVariant, TileVariantsConfig, TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';

export type ApiResult<T> = { ok: true; value: T } | { ok: false; message: string };

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `Request failed (${response.status}).`;
}

export async function saveVariant(variant: TileVariant, isNew: boolean): Promise<ApiResult<TileVariantsConfig>> {
  const response = await fetch('/api/tile-variants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant, isNew }),
  });
  if (!response.ok) return { ok: false, message: await readError(response) };
  const { config } = (await response.json()) as { config: TileVariantsConfig };
  return { ok: true, value: config };
}

export async function deleteVariant(id: string): Promise<ApiResult<TileVariantsConfig>> {
  const response = await fetch(`/api/tile-variants?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) return { ok: false, message: await readError(response) };
  const { config } = (await response.json()) as { config: TileVariantsConfig };
  return { ok: true, value: config };
}

export async function uploadImage(type: TileVariantType, file: File): Promise<ApiResult<{ config: TileVariantsConfig; imagePath: string }>> {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  const response = await fetch('/api/tile-variants/images', { method: 'POST', body: form });
  if (!response.ok) return { ok: false, message: await readError(response) };
  return { ok: true, value: (await response.json()) as { config: TileVariantsConfig; imagePath: string } };
}
