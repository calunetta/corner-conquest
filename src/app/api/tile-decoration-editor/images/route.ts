import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem reads) — see plan.md's Decisions.
const DECORATIONS_DIR = 'public/sprites/decorations';
const MANIFEST_PATH = 'public/sprites/decorations/generated/manifest.json';
const IMAGE_EXTENSIONS = new Set(['.gif', '.png', '.jpg', '.jpeg', '.webp']);

/** Opaque originals mapped to their transparent copies by scripts/decorations/sync-decorations.mjs. */
async function readManifest(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), MANIFEST_PATH), 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const files = await readdir(path.join(process.cwd(), DECORATIONS_DIR));
  const manifest = await readManifest();
  const originals = files
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()) && !(file in manifest))
    .map((file) => `/sprites/decorations/${file}`);
  const generated = Object.values(manifest).map((file) => `/sprites/decorations/${file}`);

  return NextResponse.json({ images: [...originals, ...generated] });
}
