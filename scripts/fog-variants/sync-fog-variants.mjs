// Finds every public/sprites/fog-still{n}.png and registers it as a fog variant.
//
// - Fully opaque images get their neutral-grey checkerboard keyed out to transparent, and the result
//   is written to public/sprites/fog-variants/fog-still{n}-still.png.
// - Images that already have transparency are copied as they are.
// - fog-variants.config.json is rebuilt for the fog-still entries; other variants (default, uploads)
//   are kept. Generated files for stills that were removed are deleted.
//
// Runs automatically before `npm run dev` and `npm run build` (predev/prebuild).

import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPRITES_DIR = path.join(ROOT, 'public', 'sprites');
const VARIANTS_DIR = path.join(SPRITES_DIR, 'fog-variants');
const CONFIG_PATH = path.join(ROOT, 'src', 'modules', 'map', 'components', 'TileFog', 'fog-variants.config.json');
const SOURCE_PATTERN = /^fog-still(\d+)\.png$/;
const GENERATED_PATTERN = /^fog-still\d+-still\.png$/;
/** Neutral grey (r = g = b, within this spread) is the baked-in checkerboard. */
const GREY_SPREAD = 6;

/** Returns the keyed RGBA buffer, or null when the image already has transparency. */
async function toTransparentPng(sourcePath) {
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let hasTransparency = false;
  for (let p = 3; p < data.length; p += 4) {
    if (data[p] < 255) {
      hasTransparency = true;
      break;
    }
  }
  if (hasTransparency) return null;

  for (let p = 0; p < data.length; p += 4) {
    const max = Math.max(data[p], data[p + 1], data[p + 2]);
    const min = Math.min(data[p], data[p + 1], data[p + 2]);
    if (max - min <= GREY_SPREAD) data[p + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function main() {
  const files = await readdir(SPRITES_DIR);
  const sources = files
    .map((name) => ({ name, match: SOURCE_PATTERN.exec(name) }))
    .filter((entry) => entry.match)
    .map((entry) => ({ file: entry.name, number: Number(entry.match[1]) }))
    .sort((a, b) => a.number - b.number);

  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'));
  const template = config.variants.find((variant) => !variant.id.startsWith('fog-still')) ?? config.variants[0];
  const kept = config.variants.filter((variant) => !variant.id.startsWith('fog-still'));

  const generated = [];
  for (const { file, number } of sources) {
    const id = `fog-still${number}`;
    const outputName = `${id}-still.png`;
    const transparentPng = await toTransparentPng(path.join(SPRITES_DIR, file));
    const output = path.join(VARIANTS_DIR, outputName);
    if (transparentPng) {
      await writeFile(output, transparentPng);
    } else {
      await sharp(path.join(SPRITES_DIR, file)).toFile(output);
    }
    generated.push({
      id,
      name: `Fog still ${number}`,
      still: `/sprites/fog-variants/${outputName}`,
      animation: template.animation,
      frameDelayMs: template.frameDelayMs,
      passMs: template.passMs,
    });
  }

  const wanted = new Set(generated.map((variant) => path.basename(variant.still)));
  for (const name of await readdir(VARIANTS_DIR).catch(() => [])) {
    if (GENERATED_PATTERN.test(name) && !wanted.has(name)) await rm(path.join(VARIANTS_DIR, name));
  }

  const next = { variants: [...kept, ...generated] };
  const nextJson = `${JSON.stringify(next, null, 2)}\n`;
  if (nextJson !== (await readFile(CONFIG_PATH, 'utf-8'))) {
    await writeFile(CONFIG_PATH, nextJson);
    console.log(`fog variants: ${next.variants.length} registered (${generated.length} from fog-still files)`);
  }
}

main().catch((error) => {
  console.error('sync-fog-variants failed:', error);
  process.exitCode = 1;
});
