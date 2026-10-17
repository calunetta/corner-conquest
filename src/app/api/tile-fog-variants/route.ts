import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { NextResponse } from 'next/server';
import type { FogVariant } from '@/modules/map/components/TileFog/TileFog.config';
import { decodeGifFrames } from './gif';
import { isGifBytes, isPngBytes, MAX_UPLOAD_BYTES, toVariantId } from './upload';
import { readVariants, VARIANTS_PUBLIC_DIR, writeAsset, writeVariants } from './variants-config';

// Dev-only: every request needs the dev-tools token (see src/lib/dev-tools/access.ts).

function errorResponse(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}

/** Accepts multipart fields: `name`, `still` (PNG) and `animation` (GIF). Writes both files and appends to the config. */
export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const form = await request.formData();
  const name = form.get('name');
  const still = form.get('still');
  const animation = form.get('animation');
  if (typeof name !== 'string' || !(still instanceof File) || !(animation instanceof File)) {
    return errorResponse('Upload needs a name, a still PNG and an animation GIF.', 400);
  }

  const id = toVariantId(name);
  if (!id) return errorResponse('The name needs at least one letter or digit.', 400);

  const variants = await readVariants();
  if (variants.some((variant) => variant.id === id)) {
    return errorResponse(`A variant called "${id}" already exists.`, 409);
  }

  const stillBytes = new Uint8Array(await still.arrayBuffer());
  const animationBytes = new Uint8Array(await animation.arrayBuffer());
  if (stillBytes.byteLength > MAX_UPLOAD_BYTES || animationBytes.byteLength > MAX_UPLOAD_BYTES) {
    return errorResponse('Each file must be 2 MB or smaller.', 413);
  }
  if (!isPngBytes(stillBytes)) return errorResponse('The still frame must be a PNG.', 400);
  if (!isGifBytes(animationBytes)) return errorResponse('The animation must be a GIF.', 400);

  const decoded = await decodeGifFrames(animationBytes).catch(() => null);
  if (!decoded) return errorResponse('The animation GIF could not be read.', 400);
  const frameDelayMs = decoded.delaysMs[0];
  const stillPath = `${VARIANTS_PUBLIC_DIR}/${id}-still.png`;
  const animationPath = `${VARIANTS_PUBLIC_DIR}/${id}-fog.gif`;
  await writeAsset(stillPath, stillBytes);
  await writeAsset(animationPath, animationBytes);

  const variant: FogVariant = {
    id,
    name: name.trim(),
    still: stillPath,
    animation: animationPath,
    frameDelayMs,
    passMs: decoded.delaysMs.reduce((total, delay) => total + delay, 0),
  };
  await writeVariants([...variants, variant]);

  return NextResponse.json({ variant });
}
