import { readdir } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem reads) — see plan.md's Decisions.
const DECORATIONS_DIR = 'public/sprites/decorations';
const IMAGE_EXTENSIONS = new Set(['.gif', '.png', '.jpg', '.jpeg', '.webp']);

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const files = await readdir(path.join(process.cwd(), DECORATIONS_DIR));
  const images = files
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => `/sprites/decorations/${file}`);

  return NextResponse.json({ images });
}
