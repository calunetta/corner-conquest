import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { listDevToolDirectory, saveDevToolFiles } from '@/lib/dev-tools/save-file';
import path from 'path';
import { NextResponse } from 'next/server';

// Dev-only: every request needs the dev-tools token (see src/lib/dev-tools/access.ts).
const UPLOADS_DIR = 'public/sprites/icon-overrides';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
// iconId becomes a filename segment (see POST below); restrict it to a safe slug so it can
// never escape UPLOADS_DIR via "/", "\" or "..".
const SAFE_ICON_ID = /^[a-zA-Z0-9_-]+$/;

export async function GET(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const files = await listDevToolDirectory(UPLOADS_DIR);

  const images = files
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => `/sprites/icon-overrides/${file}`);

  return NextResponse.json({ images });
}

export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

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
  const result = await saveDevToolFiles({
    changes: [{ path: `${UPLOADS_DIR}/${filename}`, content: new Uint8Array(await file.arrayBuffer()), baseSha: null }],
    message: `chore(icons): upload ${filename}`,
  });
  if (result.status === 'conflict') {
    return NextResponse.json({ error: 'That file name is already taken. Try again.' }, { status: 409 });
  }

  return NextResponse.json({
    path: `/sprites/icon-overrides/${filename}`,
    pullRequestUrl: result.status === 'saved' && result.pullRequest.url ? result.pullRequest.url : null,
  });
}
