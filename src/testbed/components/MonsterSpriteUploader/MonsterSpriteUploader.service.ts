import type { MonsterCatalogEntry } from '@/modules/game-rules';
import type { AddMonsterErrorBody, CatalogEdit, CatalogRemoval, UploadField } from './MonsterSpriteUploader.types';

const ENDPOINT = '/api/monster-catalog';

/** The catalog as the live copy has it, and the sha the next change must send back. */
export interface CatalogSnapshot {
  entries: MonsterCatalogEntry[];
  sha: string;
}

/** What a saved change returns: the new catalog, its sha, and the pull request it landed in (null locally). */
export interface CatalogSaveResult extends CatalogSnapshot {
  entry?: MonsterCatalogEntry;
  pullRequestUrl: string | null;
}

export interface AddMonsterRequest {
  name: string;
  level: number;
  isBoss: boolean;
  idleFile: File;
  attackFile: File | null;
}

/**
 * Thrown by every catalog call. `field` is set when the server names the bad input. `newer` is set on a
 * conflict: the catalog changed elsewhere, and this is the saved version to reload.
 */
export class AddMonsterError extends Error {
  field?: UploadField;
  newer?: CatalogSnapshot;

  constructor(message: string, field?: UploadField, newer?: CatalogSnapshot) {
    super(message);
    this.name = 'AddMonsterError';
    this.field = field;
    this.newer = newer;
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as (AddMonsterErrorBody & Partial<CatalogSnapshot>) | null;
  const newer = response.status === 409 && body?.entries && body.sha ? { entries: body.entries, sha: body.sha } : undefined;
  throw new AddMonsterError(body?.error ?? `Failed to change the monster catalog: ${response.status}`, body?.field ?? undefined, newer);
}

/** The saved catalog and its sha, for the editor's first load. */
export async function loadCatalog(): Promise<CatalogSnapshot> {
  const response = await fetch(ENDPOINT);
  await throwIfNotOk(response);
  return (await response.json()) as CatalogSnapshot;
}

/** POSTs the sprite files with the catalog sha the editor holds. */
export async function addMonster(request: AddMonsterRequest, baseSha: string): Promise<CatalogSaveResult> {
  const formData = new FormData();
  formData.set('name', request.name);
  formData.set('level', String(request.level));
  formData.set('isBoss', String(request.isBoss));
  formData.set('idle', request.idleFile);
  if (request.attackFile) formData.set('attack', request.attackFile);
  formData.set('baseSha', baseSha);

  const response = await fetch(ENDPOINT, { method: 'POST', body: formData });
  await throwIfNotOk(response);
  return (await response.json()) as CatalogSaveResult;
}

/** PATCHes a monster's level and Boss flag, with the catalog sha the editor holds. */
export async function updateMonster(edit: CatalogEdit, baseSha: string): Promise<CatalogSaveResult> {
  const response = await fetch(ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...edit, baseSha }),
  });
  await throwIfNotOk(response);
  return (await response.json()) as CatalogSaveResult;
}

/** DELETEs an uploaded monster, with the catalog sha the editor holds. */
export async function deleteMonster(removal: CatalogRemoval, baseSha: string): Promise<CatalogSaveResult> {
  const response = await fetch(ENDPOINT, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...removal, baseSha }),
  });
  await throwIfNotOk(response);
  return (await response.json()) as CatalogSaveResult;
}
