import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { gitBlobSha, readDevToolFile, saveDevToolFiles } from '@/lib/dev-tools/save-file';
import { NextResponse } from 'next/server';
import { isTileVariantsConfig, type TileVariant, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toVariantId, validateVariant } from '@/modules/map/components/TileVariants/TileVariants.validate';

// Dev-only: tile-variants.config.json is never part of the game build. Saves go through the dev-tool save target.
const CONFIG_PATH = 'src/modules/map/components/TileVariants/tile-variants.config.json';

interface ConfigSnapshot {
  config: TileVariantsConfig;
  /** Blob sha of the file; the editor sends it back so a stale save is refused. */
  sha: string;
}

async function readSnapshot(): Promise<ConfigSnapshot> {
  const file = await readDevToolFile(CONFIG_PATH);
  const parsed: unknown = JSON.parse(file.content);
  if (!isTileVariantsConfig(parsed)) throw new Error('tile-variants.config.json is malformed.');
  return { config: parsed, sha: file.sha };
}

function errorResponse(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}

function conflictResponse(newer: ConfigSnapshot): Response {
  return NextResponse.json(
    { error: 'The tile variants changed since you loaded them. The newer version is loaded; re-apply your change.', ...newer },
    { status: 409 },
  );
}

/**
 * Applies one change to the newest config and saves it, unless the file has moved past `baseSha`.
 * `apply` returns an error message to refuse the change, or the next config.
 */
async function changeConfig(
  baseSha: string | undefined,
  message: string,
  apply: (current: TileVariantsConfig) => TileVariantsConfig | Response,
): Promise<Response> {
  const current = await readSnapshot();
  if (baseSha !== undefined && baseSha !== current.sha) return conflictResponse(current);

  const next = apply(current.config);
  if (next instanceof Response) return next;

  const content = `${JSON.stringify(next, null, 2)}\n`;
  const result = await saveDevToolFiles({ changes: [{ path: CONFIG_PATH, content, baseSha: current.sha }], message });
  if (result.status === 'conflict') return conflictResponse(await readSnapshot());

  return NextResponse.json({
    config: next,
    sha: gitBlobSha(content),
    pullRequestUrl: result.status === 'saved' && result.pullRequest.url ? result.pullRequest.url : null,
  });
}

/** Returns the saved config and its sha. */
export async function GET(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  return NextResponse.json(await readSnapshot());
}

/** Creates a variant (`isNew`) or updates one by id. The id of a new variant is derived from its type, colour and name. */
export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const body = (await request.json()) as { variant?: TileVariant; isNew?: boolean; baseSha?: string };
  if (!body.variant || typeof body.isNew !== 'boolean') return errorResponse('Send a variant and isNew.', 400);
  const { variant: sent, isNew } = { variant: body.variant, isNew: body.isNew };

  return changeConfig(body.baseSha, `chore(tile-variants): save ${sent.id || sent.name}`, (config) => {
    const variant: TileVariant = {
      ...sent,
      name: sent.name?.trim() ?? '',
      id: isNew ? toVariantId(sent.type, sent.color, sent.name ?? '') : sent.id,
    };
    const problem = validateVariant(config, variant, isNew);
    if (problem) return errorResponse(problem, 400);
    if (!isNew && !config.variants.some((existing) => existing.id === variant.id)) {
      return errorResponse(`No variant called "${variant.id}".`, 404);
    }

    const variants = isNew
      ? [...config.variants, variant]
      : config.variants.map((existing) => (existing.id === variant.id ? variant : existing));
    return { ...config, variants };
  });
}

/** Deletes a variant by id. The default variants cannot be deleted. */
export async function DELETE(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (!id) return errorResponse('Send the variant id.', 400);
  if (id.startsWith('default-')) return errorResponse('Default variants cannot be deleted.', 400);

  return changeConfig(params.get('baseSha') ?? undefined, `chore(tile-variants): delete ${id}`, (config) => {
    if (!config.variants.some((variant) => variant.id === id)) return errorResponse(`No variant called "${id}".`, 404);
    return { ...config, variants: config.variants.filter((variant) => variant.id !== id) };
  });
}
