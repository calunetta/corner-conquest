import type { DecorationLayoutsConfig, IslandTileSlotsDraft } from '@/modules/map';
import type { ListDecorationImagesResponseBody, SaveDecorationLayoutsRequestBody } from './TileDecorationEditor.types';
import type { SaveDefaultElementsRequestBody } from './TileDecorationEditor.defaultElements.types';

const IMAGES_ENDPOINT = '/api/tile-decoration-editor/images';
const LAYOUTS_ENDPOINT = '/api/tile-decoration-editor/layouts';
const DEFAULT_ELEMENTS_ENDPOINT = '/api/tile-decoration-editor/default-elements';

/** GETs the auto-discovered decoration image list from the dev-only API route. */
export async function listDecorationImages(): Promise<string[]> {
  const response = await fetch(IMAGES_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Failed to load decoration images: ${response.status}`);
  }

  const body = (await response.json()) as ListDecorationImagesResponseBody;
  return body.images;
}

/** POSTs the whole edited config to the dev-only save route, overwriting the config file. */
export async function saveDecorationLayouts(config: DecorationLayoutsConfig): Promise<void> {
  const response = await fetch(LAYOUTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config } satisfies SaveDecorationLayoutsRequestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to save decoration layouts: ${response.status}`);
  }
}

/** POSTs the edited default-elements draft to the dev-only save route, which regenerates
 *  island-tile-slots.types.ts as TS source. */
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
