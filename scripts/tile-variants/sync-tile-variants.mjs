// Scans public/sprites/tile-variants/<type>/ and lists every image in tile-variants.config.json.
//
// - Stills (PNG) without transparency get their neutral-grey checkerboard keyed out. Each image is
//   written to public/sprites/tile-variants/generated/<type>/ and that copy is what the game draws.
// - GIFs are copied only when they already have transparency. Opaque GIFs are skipped with a warning.
// - `images` is rebuilt from the folders. `variants` is kept, except that the default variants
//   (one per type, one per castle colour) are created when missing.
// - Generated files are deleted only when no variant uses them.
//
// Runs automatically before `npm run dev` and `npm run build` (predev/prebuild).

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_DIR = path.join(ROOT, 'public', 'sprites', 'tile-variants');
const GENERATED_DIR = path.join(SOURCE_DIR, 'generated');
const CONFIG_PATH = path.join(ROOT, 'src', 'modules', 'map', 'components', 'TileVariants', 'tile-variants.config.json');
const TYPES = ['base', 'special', 'monster', 'empty', 'resource-food', 'resource-wood', 'resource-gold'];
const COLORS = ['blue', 'red', 'purple', 'yellow'];
const IMAGE_PATTERN = /\.(png|gif)$/i;
/** Neutral grey (r = g = b, within this spread) is the baked-in checkerboard. */
const GREY_SPREAD = 6;
const CENTRED = { x: 50, y: 50, size: 100 };

/** Returns a keyed PNG buffer, or null when the image already has transparency. */
async function keyedPng(sourcePath) {
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let p = 3; p < data.length; p += 4) {
    if (data[p] < 255) return null;
  }
  for (let p = 0; p < data.length; p += 4) {
    const max = Math.max(data[p], data[p + 1], data[p + 2]);
    const min = Math.min(data[p], data[p + 1], data[p + 2]);
    if (max - min <= GREY_SPREAD) data[p + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function hasTransparency(sourcePath) {
  const { data } = await sharp(sourcePath, { animated: true, pages: 1 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let p = 3; p < data.length; p += 4) {
    if (data[p] < 255) return true;
  }
  return false;
}

/** Writes one source image into the generated folder. Returns the file name written, or null if skipped. */
async function generate(type, sourcePath, baseName, extension) {
  const outputDir = path.join(GENERATED_DIR, type);
  await mkdir(outputDir, { recursive: true });

  if (extension === 'gif') {
    if (!(await hasTransparency(sourcePath))) {
      console.warn(`tile variants: skipped ${type}/${baseName}.gif (opaque GIF; add a transparent one)`);
      return null;
    }
    await copyFile(sourcePath, path.join(outputDir, `${baseName}.gif`));
    return `${baseName}.gif`;
  }

  const png = await keyedPng(sourcePath);
  if (png) {
    await writeFile(path.join(outputDir, `${baseName}.png`), png);
  } else {
    await copyFile(sourcePath, path.join(outputDir, `${baseName}.png`));
  }
  return `${baseName}.png`;
}

async function listImages(dir) {
  const names = await readdir(dir).catch(() => []);
  return names.filter((name) => IMAGE_PATTERN.test(name)).sort();
}

/** The default variant for a type (or for one castle colour of the base). */
function defaultVariant(type, color) {
  const id = type === 'base' ? `default-base-${color}` : `default-${type}`;
  return { id, type, name: 'Default', image: null, transform: CENTRED, color: color ?? null };
}

function withDefaults(variants) {
  const ids = new Set(variants.map((variant) => variant.id));
  const missing = [];
  for (const type of TYPES) {
    if (type === 'base') {
      for (const color of COLORS) missing.push(defaultVariant('base', color));
    } else {
      missing.push(defaultVariant(type, null));
    }
  }
  return [...variants, ...missing.filter((variant) => !ids.has(variant.id))];
}

async function main() {
  const existing = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'));
  const images = [];
  for (const type of TYPES) {
    for (const name of await listImages(path.join(SOURCE_DIR, type))) {
      const extension = path.extname(name).slice(1).toLowerCase();
      const baseName = path.basename(name, path.extname(name));
      const written = await generate(type, path.join(SOURCE_DIR, type, name), baseName, extension);
      if (!written) continue;
      images.push({ id: `${type}-${baseName}`, type, name: baseName, image: `/sprites/tile-variants/generated/${type}/${written}` });
    }
  }

  const variants = withDefaults(existing.variants ?? []);
  const usedImages = new Set(variants.map((variant) => variant.image).filter(Boolean));
  for (const type of TYPES) {
    const keep = new Set(images.filter((image) => image.type === type).map((image) => path.basename(image.image)));
    const outputDir = path.join(GENERATED_DIR, type);
    for (const name of await readdir(outputDir).catch(() => [])) {
      const publicPath = `/sprites/tile-variants/generated/${type}/${name}`;
      if (!keep.has(name) && !usedImages.has(publicPath)) await rm(path.join(outputDir, name));
    }
  }
  const next = { images, variants };
  const nextJson = `${JSON.stringify(next, null, 2)}\n`;
  if (nextJson !== (await readFile(CONFIG_PATH, 'utf-8'))) {
    await writeFile(CONFIG_PATH, nextJson);
    console.log(`tile variants: ${images.length} image(s), ${variants.length} variant(s)`);
  }
}

main().catch((error) => {
  console.error('sync-tile-variants failed:', error);
  process.exitCode = 1;
});
