import { execFile } from 'child_process';
import { access, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import { isTileVariantsConfig, TILE_VARIANT_TYPES, type TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';
import { toSlug } from '@/modules/map/components/TileVariants/TileVariants.validate';
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
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const form = await request.formData();
  const type = form.get('type');
  const file = form.get('file');
  if (typeof type !== 'string' || !(TILE_VARIANT_TYPES as readonly string[]).includes(type) || !(file instanceof File)) {
    return NextResponse.json({ error: 'Upload needs a type and a PNG or GIF file.' }, { status: 400 });
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
