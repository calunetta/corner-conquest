import type { IconOverridesConfig } from '@/modules/icons';
import type {
  ListIconUploadsResponseBody,
  SaveIconOverridesRequestBody,
  UploadIconImageResponseBody,
} from './IconEditor.types';

const UPLOADS_ENDPOINT = '/api/icon-editor/uploads';
const OVERRIDES_ENDPOINT = '/api/icon-editor/overrides';

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

/** POSTs the whole edited overrides config to the dev-only save route, overwriting the config file. */
export async function saveIconOverrides(overrides: IconOverridesConfig): Promise<void> {
  const response = await fetch(OVERRIDES_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides } satisfies SaveIconOverridesRequestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to save icon overrides: ${response.status}`);
  }
}
