import type { DecorationLayoutsConfig, IslandTileSlotsDraft } from '@/modules/map';
import type { TileVariant, TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import type { ListDecorationImagesResponseBody, SaveDecorationLayoutsRequestBody } from './TileDecorationEditor.types';
import type { SaveDefaultElementsRequestBody } from './TileDecorationEditor.defaultElements.types';

const IMAGES_ENDPOINT = '/api/tile-decoration-editor/images';
const LAYOUTS_ENDPOINT = '/api/tile-decoration-editor/layouts';
const DEFAULT_ELEMENTS_ENDPOINT = '/api/tile-decoration-editor/default-elements';
const TILE_VARIANTS_ENDPOINT = '/api/tile-variants';

/** A saved file and the sha the next save must send back. */
export interface Snapshot<T> {
  config: T;
  sha: string;
}

/** Thrown when the saved file moved on since the editor loaded it. `newer` is the saved version now. */
export class SaveConflictError<T> extends Error {
  constructor(readonly newer: Snapshot<T>) {
    super('The saved copy changed since it was loaded.');
  }
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `${fallback}: ${response.status}`;
}

/** Deletes a decoration image and every instance that draws it. Resolves with the number of instances removed. */
export async function deleteDecorationImage(image: string): Promise<number> {
  const response = await fetch(`${IMAGES_ENDPOINT}?image=${encodeURIComponent(image)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to delete the decoration image'));
  const body = (await response.json()) as { removedInstances: number };
  return body.removedInstances;
}

/** GETs the auto-discovered decoration image list from the dev-only API route. */
export async function listDecorationImages(): Promise<string[]> {
  const response = await fetch(IMAGES_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Failed to load decoration images: ${response.status}`);
  }

  const body = (await response.json()) as ListDecorationImagesResponseBody;
  return body.images;
}

/** The saved default decoration layouts and their sha. */
export async function loadDecorationLayouts(): Promise<Snapshot<DecorationLayoutsConfig>> {
  const response = await fetch(LAYOUTS_ENDPOINT);
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to load decoration layouts'));
  return (await response.json()) as Snapshot<DecorationLayoutsConfig>;
}

/** The saved tile variants (which own their own decoration layouts) and their sha. */
export async function loadTileVariants(): Promise<Snapshot<TileVariantsConfig>> {
  const response = await fetch(TILE_VARIANTS_ENDPOINT);
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to load tile variants'));
  return (await response.json()) as Snapshot<TileVariantsConfig>;
}

/** Saves the default decoration layouts. Throws SaveConflictError when the saved file has moved on. */
export async function saveDecorationLayouts(config: DecorationLayoutsConfig, baseSha: string): Promise<{ sha: string }> {
  const response = await fetch(LAYOUTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, baseSha } satisfies SaveDecorationLayoutsRequestBody & { baseSha: string }),
  });

  if (response.status === 409) {
    throw new SaveConflictError((await response.json()) as Snapshot<DecorationLayoutsConfig>);
  }
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to save decoration layouts'));
  return (await response.json()) as { sha: string };
}

/** Saves a variant's own decoration layouts through the tile-variant route, which validates the variant. */
export async function saveVariantDecorations(
  variant: TileVariant,
  decorations: DecorationLayoutsConfig,
  baseSha: string,
): Promise<Snapshot<TileVariantsConfig>> {
  const response = await fetch(TILE_VARIANTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant: { ...variant, decorations }, isNew: false, baseSha }),
  });

  if (response.status === 409) {
    throw new SaveConflictError((await response.json()) as Snapshot<TileVariantsConfig>);
  }
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to save variant decorations'));
  return (await response.json()) as Snapshot<TileVariantsConfig>;
}

/** POSTs the edited default-elements draft to the dev-only save route, which regenerates
 *  island-tile-slots.types.ts as TS source. Local dev server only for now. */
export async function saveDefaultElements(draft: IslandTileSlotsDraft): Promise<void> {
  const response = await fetch(DEFAULT_ELEMENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft } satisfies SaveDefaultElementsRequestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to save default elements: ${response.status}`);
  }
}
