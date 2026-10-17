import type { MonsterCatalogEntry } from '@/modules/game-rules';
import type { AddMonsterErrorBody, AddMonsterResponseBody, UploadField } from './MonsterSpriteUploader.types';

const ENDPOINT = '/api/monster-catalog';

export interface AddMonsterRequest {
  name: string;
  level: number;
  isBoss: boolean;
  idleFile: File;
  attackFile: File | null;
}

export class AddMonsterError extends Error {
  field?: UploadField;

  constructor(message: string, field?: UploadField) {
    super(message);
    this.name = 'AddMonsterError';
    this.field = field;
  }
}

async function readErrorBody(response: Response): Promise<AddMonsterErrorBody | null> {
  try {
    return (await response.json()) as AddMonsterErrorBody;
  } catch {
    return null;
  }
}

/** POSTs the sprite files to the dev-only route, which also regenerates the catalog sources.
 *  Throws AddMonsterError (with `field` when the server named one) on a non-ok response. */
export async function addMonster(request: AddMonsterRequest): Promise<MonsterCatalogEntry> {
  const formData = new FormData();
  formData.set('name', request.name);
  formData.set('level', String(request.level));
  formData.set('isBoss', String(request.isBoss));
  formData.set('idle', request.idleFile);
  if (request.attackFile) formData.set('attack', request.attackFile);

  const response = await fetch(ENDPOINT, { method: 'POST', body: formData });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new AddMonsterError(body?.error ?? `Failed to add monster: ${response.status}`, body?.field ?? undefined);
  }

  const body = (await response.json()) as AddMonsterResponseBody;
  return body.entry;
}
