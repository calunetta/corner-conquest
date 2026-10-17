import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { isGitHubTarget } from '@/lib/dev-tools/save-file';
import { execFile } from 'child_process';
import { access, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import { isTileVariantsConfig, TILE_VARIANT_TYPES, usesBuiltInArtOnly, type TileVariantsConfig, type TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toSlug, variantsUsingImage } from '@/modules/map/components/TileVariants/TileVariants.validate';
import { isGifBytes, isPngBytes, MAX_UPLOAD_BYTES } from '../../tile-fog-variants/upload';

// Dev-only. Saves an uploaded picture into its type folder, then runs the sync script so it is listed right away.
const SYNC_SCRIPT = 'scripts/tile-variants/sync-tile-variants.mjs';
const CONFIG_PATH = 'src/modules/map/components/TileVariants/tile-variants.config.json';
const execFileAsync = promisify(execFile);

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath).then(() => true, () => false);
}

/** `<slug>.<ext>`, with `-2`, `-3`... added when the name is taken in that folder. */
async function freeFileName(folder: string, slug: string, extension: string): Promise<string> {
  let candidate = `${slug}.${extension}`;
  for (let n = 2; await fileExists(path.join(folder, candidate)); n++) {
    candidate = `${slug}-${n}.${extension}`;
  }
  return candidate;
}

export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;
  if (isGitHubTarget()) {
    return NextResponse.json({ error: 'Picture uploads only work on the local dev server for now.' }, { status: 501 });
  }

  const form = await request.formData();
  const type = form.get('type');
  const file = form.get('file');
  if (typeof type !== 'string' || !(TILE_VARIANT_TYPES as readonly string[]).includes(type) || !(file instanceof File)) {
    return NextResponse.json({ error: 'Upload needs a type and a PNG or GIF file.' }, { status: 400 });
  }
  if (usesBuiltInArtOnly(type as TileVariantType)) {
    return NextResponse.json({ error: 'This island always uses the built-in art, so it takes no pictures.' }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'The file must be 2 MB or smaller.' }, { status: 413 });
  }
  const extension = isPngBytes(bytes) ? 'png' : isGifBytes(bytes) ? 'gif' : null;
  if (!extension) return NextResponse.json({ error: 'Only PNG and GIF files can be uploaded.' }, { status: 400 });

  const slug = toSlug(path.basename(file.name, path.extname(file.name)));
  if (!slug) return NextResponse.json({ error: 'The file name needs a letter or digit.' }, { status: 400 });

  const folder = path.join(process.cwd(), 'public', 'sprites', 'tile-variants', type as TileVariantType);
  const fileName = await freeFileName(folder, slug, extension);
  await writeFile(path.join(folder, fileName), bytes);

  await execFileAsync(process.execPath, [path.join(process.cwd(), SYNC_SCRIPT)], { cwd: process.cwd() });
  const config: unknown = JSON.parse(await readFile(path.join(process.cwd(), CONFIG_PATH), 'utf-8'));
  if (!isTileVariantsConfig(config)) return NextResponse.json({ error: 'tile-variants.config.json is malformed.' }, { status: 500 });

  // The sync writes PNGs as PNG; GIFs are only listed when already transparent (see the sync script).
  const baseName = path.basename(fileName, `.${extension}`);
  const imagePath = `/sprites/tile-variants/generated/${type}/${baseName}.${extension}`;
  if (!config.images.some((image) => image.image === imagePath)) {
    await rm(path.join(folder, fileName));
    return NextResponse.json({ error: 'That GIF is opaque. Add a transparent GIF.' }, { status: 400 });
  }

  return NextResponse.json({ config, imagePath });
}

/** Deletes an uploaded picture from its type folder, then re-runs the sync so the list no longer offers it. */
export async function DELETE(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;
  if (isGitHubTarget()) {
    return NextResponse.json({ error: 'Picture uploads only work on the local dev server for now.' }, { status: 501 });
  }

  const imagePath = new URL(request.url).searchParams.get('image');
  if (!imagePath) return NextResponse.json({ error: 'Send the picture path.' }, { status: 400 });
  const config = await readConfigFile();
  const image = config.images.find((candidate) => candidate.image === imagePath);
  if (!image) return NextResponse.json({ error: 'That picture is not in the tile-variant folders.' }, { status: 404 });

  const users = variantsUsingImage(config, imagePath);
  if (users.length > 0) {
    const names = users.map((variant) => variant.name || variant.id).join(', ');
    return NextResponse.json({ error: `Still used by ${names}. Set those variants to Built-in and save, then delete.` }, { status: 400 });
  }

  const sourceFolder = path.join(process.cwd(), 'public', 'sprites', 'tile-variants', image.type);
  await rm(path.join(sourceFolder, path.basename(imagePath)), { force: true });
  await execFileAsync(process.execPath, [path.join(process.cwd(), SYNC_SCRIPT)], { cwd: process.cwd() });
  return NextResponse.json({ config: await readConfigFile() });
}

async function readConfigFile(): Promise<TileVariantsConfig> {
  const config: unknown = JSON.parse(await readFile(path.join(process.cwd(), CONFIG_PATH), 'utf-8'));
  if (!isTileVariantsConfig(config)) throw new Error('tile-variants.config.json is malformed.');
  return config;
}
