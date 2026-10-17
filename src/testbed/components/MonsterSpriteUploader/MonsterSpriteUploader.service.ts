import type { MonsterCatalogEntry } from '@/modules/game-rules';
import type {
  AddMonsterErrorBody,
  AddMonsterResponseBody,
  CatalogEdit,
  CatalogRemoval,
  UpdateMonsterResponseBody,
  UploadField,
} from './MonsterSpriteUploader.types';

const ENDPOINT = '/api/monster-catalog';

export interface AddMonsterRequest {
  name: string;
  level: number;
  isBoss: boolean;
  idleFile: File;
  attackFile: File | null;
}

/** Thrown by both the add and the edit call; `field` is set when the server names the bad input. */
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

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = await readErrorBody(response);
  throw new AddMonsterError(body?.error ?? `Failed to add monster: ${response.status}`, body?.field ?? undefined);
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
  await throwIfNotOk(response);
  const body = (await response.json()) as AddMonsterResponseBody;
  return body.entry;
}

/** PATCHes a monster's level and Boss flag; the route moves its sprite files and regenerates the
 *  catalog. Throws AddMonsterError on a non-ok response. */
export async function updateMonster(edit: CatalogEdit): Promise<MonsterCatalogEntry> {
  const response = await fetch(ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edit),
  });
  await throwIfNotOk(response);
  const body = (await response.json()) as UpdateMonsterResponseBody;
  return body.entry;
}

/** DELETEs an uploaded monster; the route removes its sprite file(s) and regenerates the catalog.
 *  Throws AddMonsterError on a non-ok response. */
export async function deleteMonster(removal: CatalogRemoval): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(removal),
  });
  await throwIfNotOk(response);
}
