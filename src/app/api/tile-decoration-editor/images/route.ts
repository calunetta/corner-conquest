import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { isGitHubTarget } from '@/lib/dev-tools/save-file';
import { access, readdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isTileVariantsConfig, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import {
  isDecorationImagePath,
  removeImageFromLayouts,
  removeImageFromVariants,
} from '@/modules/map/decoration-image-cleanup.map';
import { DECORATION_LAYOUTS_CONFIG_PATH } from '@/modules/map/decoration-layouts.types';
import type { DecorationLayoutsConfig } from '@/modules/map/decoration-layouts.types';

// Dev-only: every request needs the dev-tools token (see src/lib/dev-tools/access.ts).
const DECORATIONS_DIR = 'public/sprites/decorations';
const MANIFEST_PATH = 'public/sprites/decorations/generated/manifest.json';
const TILE_VARIANTS_CONFIG_PATH = 'src/modules/map/components/TileVariants/tile-variants.config.json';
const IMAGE_EXTENSIONS = new Set(['.gif', '.png', '.jpg', '.jpeg', '.webp']);

/** Opaque originals mapped to their transparent copies by scripts/decorations/sync-decorations.mjs. */
async function readManifest(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), MANIFEST_PATH), 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function GET(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const files = await readdir(path.join(process.cwd(), DECORATIONS_DIR));
  const manifest = await readManifest();
  const originals = files
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()) && !(file in manifest))
    .map((file) => `/sprites/decorations/${file}`);
  const generated = Object.values(manifest).map((file) => `/sprites/decorations/${file}`);

  return NextResponse.json({ images: [...originals, ...generated] });
}

async function exists(filePath: string): Promise<boolean> {
  return access(filePath).then(() => true, () => false);
}

/** Deletes a decoration image and every instance that draws it, so no layout or variant can point at a missing file. */
export async function DELETE(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const image = new URL(request.url).searchParams.get('image');
  if (!isDecorationImagePath(image)) {
    return NextResponse.json({ error: 'Send the path of a file in public/sprites/decorations/.' }, { status: 400 });
  }
  if (isGitHubTarget()) {
    return NextResponse.json({ error: 'Deleting decoration images only works on the local checkout.' }, { status: 400 });
  }

  const fileName = image.slice('/sprites/decorations/'.length);
  if (!IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
    return NextResponse.json({ error: 'That file is not an image.' }, { status: 400 });
  }
  const original = path.join(process.cwd(), DECORATIONS_DIR, fileName);
  if (!(await exists(original))) {
    return NextResponse.json({ error: 'That image is not in the decorations folder.' }, { status: 404 });
  }

  const manifest = await readManifest();
  const generatedName = manifest[fileName];
  if (generatedName) {
    await rm(path.join(process.cwd(), DECORATIONS_DIR, generatedName), { force: true });
    delete manifest[fileName];
    await writeFile(path.join(process.cwd(), MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  }
  await rm(original);

  const layoutsPath = path.join(process.cwd(), DECORATION_LAYOUTS_CONFIG_PATH);
  const layouts = JSON.parse(await readFile(layoutsPath, 'utf-8')) as DecorationLayoutsConfig;
  const layoutResult = removeImageFromLayouts(layouts, image);
  if (layoutResult.removed > 0) {
    await writeFile(layoutsPath, `${JSON.stringify(layoutResult.config, null, 2)}\n`);
  }

  const variantsPath = path.join(process.cwd(), TILE_VARIANTS_CONFIG_PATH);
  const variants: unknown = JSON.parse(await readFile(variantsPath, 'utf-8'));
  let variantRemoved = 0;
  if (isTileVariantsConfig(variants)) {
    const variantResult = removeImageFromVariants(variants as TileVariantsConfig, image);
    variantRemoved = variantResult.removed;
    if (variantRemoved > 0) await writeFile(variantsPath, `${JSON.stringify(variantResult.config, null, 2)}\n`);
  }

  return NextResponse.json({ deleted: image, removedInstances: layoutResult.removed + variantRemoved });
}
