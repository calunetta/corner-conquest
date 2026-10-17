import type { IconOverridesConfig } from '@/modules/icons';
import type {
  ListIconUploadsResponseBody,
  SaveIconOverridesRequestBody,
  UploadIconImageResponseBody,
} from './IconEditor.types';

const UPLOADS_ENDPOINT = '/api/icon-editor/uploads';
const OVERRIDES_ENDPOINT = '/api/icon-editor/overrides';

/** The saved overrides and the sha the next save must send back. */
export interface IconOverridesSnapshot {
  overrides: IconOverridesConfig;
  sha: string;
}

/** Thrown when the saved overrides moved on since the editor loaded them. `newer` is the saved version now. */
export class IconOverridesConflictError extends Error {
  constructor(readonly newer: IconOverridesSnapshot) {
    super('The saved icon overrides changed since they were loaded.');
  }
}

/** GETs the saved overrides and their sha. */
export async function loadIconOverrides(): Promise<IconOverridesSnapshot> {
  const response = await fetch(OVERRIDES_ENDPOINT);
  if (!response.ok) throw new Error(`Failed to load icon overrides: ${response.status}`);
  return (await response.json()) as IconOverridesSnapshot;
}

/** GETs the uploaded replacement images list from the dev-only API route. */
export async function listIconUploads(): Promise<string[]> {
  const response = await fetch(UPLOADS_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Failed to list icon uploads: ${response.status}`);
  }

  const body = (await response.json()) as ListIconUploadsResponseBody;
  return body.images;
}

/** POSTs a replacement image for one icon to the dev-only upload route. */
export async function uploadIconImage(iconId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.set('iconId', iconId);
  formData.set('file', file);

  const response = await fetch(UPLOADS_ENDPOINT, { method: 'POST', body: formData });

  if (!response.ok) {
    throw new Error(`Failed to upload icon image: ${response.status}`);
  }

  const body = (await response.json()) as UploadIconImageResponseBody;
  return body.path;
}

/** POSTs the edited overrides with the sha the editor loaded. Throws IconOverridesConflictError on a conflict. */
export async function saveIconOverrides(overrides: IconOverridesConfig, baseSha: string): Promise<{ sha: string }> {
  const response = await fetch(OVERRIDES_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides, baseSha } satisfies SaveIconOverridesRequestBody & { baseSha: string }),
  });

  if (response.status === 409) {
    throw new IconOverridesConflictError((await response.json()) as IconOverridesSnapshot);
  }
  if (!response.ok) {
    throw new Error(`Failed to save icon overrides: ${response.status}`);
  }
  return (await response.json()) as { sha: string };
}
