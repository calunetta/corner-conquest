import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isTileVariantsConfig, type TileVariant, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toVariantId, validateVariant } from '@/modules/map/components/TileVariants/TileVariants.validate';

// Dev-only, like the other testbed routes: writes tile-variants.config.json, which is never deployed to the game build.
const CONFIG_PATH = 'src/modules/map/components/TileVariants/tile-variants.config.json';

async function readConfig(): Promise<TileVariantsConfig | null> {
  const parsed: unknown = JSON.parse(await readFile(path.join(process.cwd(), CONFIG_PATH), 'utf-8'));
  return isTileVariantsConfig(parsed) ? parsed : null;
}

async function writeConfig(config: TileVariantsConfig): Promise<void> {
  await writeFile(path.join(process.cwd(), CONFIG_PATH), `${JSON.stringify(config, null, 2)}\n`);
}

function errorResponse(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}

/** Creates a variant (`isNew`) or updates one by id. The id of a new variant is derived from its type, colour and name. */
export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const body = (await request.json()) as { variant?: TileVariant; isNew?: boolean };
  if (!body.variant || typeof body.isNew !== 'boolean') return errorResponse('Send a variant and isNew.', 400);
  const config = await readConfig();
  if (!config) return errorResponse('tile-variants.config.json is malformed.', 500);

  const variant: TileVariant = {
    ...body.variant,
    name: body.variant.name?.trim() ?? '',
    id: body.isNew ? toVariantId(body.variant.type, body.variant.color, body.variant.name ?? '') : body.variant.id,
  };
  const problem = validateVariant(config, variant, body.isNew);
  if (problem) return errorResponse(problem, 400);

  const variants = body.isNew
    ? [...config.variants, variant]
    : config.variants.map((existing) => (existing.id === variant.id ? variant : existing));
  if (!body.isNew && !config.variants.some((existing) => existing.id === variant.id)) {
    return errorResponse(`No variant called "${variant.id}".`, 404);
  }
  const next = { ...config, variants };
  await writeConfig(next);
  return NextResponse.json({ config: next });
}

/** Deletes a variant by id. The default variants cannot be deleted. */
export async function DELETE(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return errorResponse('Send the variant id.', 400);
  if (id.startsWith('default-')) return errorResponse('Default variants cannot be deleted.', 400);
  const config = await readConfig();
  if (!config) return errorResponse('tile-variants.config.json is malformed.', 500);
  if (!config.variants.some((variant) => variant.id === id)) return errorResponse(`No variant called "${id}".`, 404);

  const next = { ...config, variants: config.variants.filter((variant) => variant.id !== id) };
  await writeConfig(next);
  return NextResponse.json({ config: next });
}
