import { mkdir, readdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem reads/writes) — see plan.md's Decisions.
const UPLOADS_DIR = 'public/sprites/icon-overrides';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
// iconId becomes a filename segment (see POST below); restrict it to a safe slug so it can
// never escape UPLOADS_DIR via "/", "\" or "..".
const SAFE_ICON_ID = /^[a-zA-Z0-9_-]+$/;

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === code;
}

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  let files: string[];
  try {
    files = await readdir(path.join(process.cwd(), UPLOADS_DIR));
  } catch (error) {
    // Fresh checkout: the folder doesn't exist until the first upload. Treat "no folder" as
    // "no uploads yet" rather than failing the request.
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      files = [];
    } else {
      throw error;
    }
  }

  const images = files
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => `/sprites/icon-overrides/${file}`);

  return NextResponse.json({ images });
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const formData = await request.formData();
  const iconId = formData.get('iconId');
  const file = formData.get('file');

  if (typeof iconId !== 'string' || iconId.length === 0 || !(file instanceof File)) {
    return NextResponse.json({ error: 'iconId and file are required.' }, { status: 400 });
  }

  if (!SAFE_ICON_ID.test(iconId)) {
    return NextResponse.json({ error: 'Invalid iconId.' }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: `Unsupported file extension: ${extension}` }, { status: 400 });
  }

  const filename = `${iconId}-${Date.now()}${extension}`;
  await mkdir(path.join(process.cwd(), UPLOADS_DIR), { recursive: true });
  await writeFile(path.join(process.cwd(), UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ path: `/sprites/icon-overrides/${filename}` });
}
