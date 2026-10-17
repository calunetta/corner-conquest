// Makes every decoration image in public/sprites/decorations/ usable with a transparent background.
//
// - PNGs that are fully opaque get their neutral-grey checkerboard keyed out. The result is written to
//   public/sprites/decorations/generated/<name>.png. The original file is not changed.
// - PNGs that already have transparency, and GIFs, are used as they are. Opaque GIFs are skipped with a warning.
// - generated/manifest.json maps each replaced original to its keyed copy. The decoration editor lists
//   the copy instead of the original.
// - Generated files and manifest entries for removed originals are deleted.
//
// Runs automatically before `npm run dev` and `npm run build` (predev/prebuild).

import { readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DECORATIONS_DIR = path.join(ROOT, 'public', 'sprites', 'decorations');
const GENERATED_DIR = path.join(DECORATIONS_DIR, 'generated');
const MANIFEST_PATH = path.join(GENERATED_DIR, 'manifest.json');
/** Neutral grey (r = g = b, within this spread) is the baked-in checkerboard. */
const GREY_SPREAD = 6;

/** Returns a keyed PNG buffer, or null when the image already has any transparency. */
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

async function main() {
  await mkdir(GENERATED_DIR, { recursive: true });
  const entries = await readdir(DECORATIONS_DIR, { withFileTypes: true });
  const images = entries.filter((entry) => entry.isFile() && /\.(png|gif)$/i.test(entry.name)).map((entry) => entry.name).sort();

  const manifest = {};
  for (const name of images) {
    const sourcePath = path.join(DECORATIONS_DIR, name);
    const extension = path.extname(name).toLowerCase();
    if (extension === '.gif') {
      if (!(await hasTransparency(sourcePath))) {
        console.warn(`decorations: ${name} is an opaque GIF and is listed as it is (add a transparent GIF)`);
      }
      continue;
    }
    const png = await keyedPng(sourcePath);
    if (!png) continue;
    const generatedName = `${path.basename(name, extension)}.png`;
    await writeFile(path.join(GENERATED_DIR, generatedName), png);
    manifest[name] = `generated/${generatedName}`;
  }

  for (const name of await readdir(GENERATED_DIR).catch(() => [])) {
    if (name === 'manifest.json') continue;
    if (!Object.values(manifest).includes(`generated/${name}`)) await rm(path.join(GENERATED_DIR, name));
  }

  const nextJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const previousJson = await readFile(MANIFEST_PATH, 'utf-8').catch(() => '');
  if (nextJson !== previousJson) {
    await writeFile(MANIFEST_PATH, nextJson);
    console.log(`decorations: ${Object.keys(manifest).length} opaque image(s) replaced by keyed copies`);
  }
}

main().catch((error) => {
  console.error('sync-decorations failed:', error);
  process.exitCode = 1;
});
