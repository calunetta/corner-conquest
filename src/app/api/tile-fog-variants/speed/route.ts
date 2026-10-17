import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { FRAME_DELAY_RANGE, type FogVariant } from '@/modules/map/components/TileFog/TileFog.config';
import { decodeGifFrames, encodeGif } from '../gif';
import { readVariants, toDiskPath, VARIANTS_PUBLIC_DIR, writeAsset, writeVariants } from '../variants-config';

// Dev-only, like the other fog routes. Re-encodes one variant's gif with a new delay per frame.

function isFrameDelay(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= FRAME_DELAY_RANGE.min &&
    value <= FRAME_DELAY_RANGE.max
  );
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const body = (await request.json()) as { id?: unknown; frameDelayMs?: unknown };
  if (typeof body.id !== 'string' || !isFrameDelay(body.frameDelayMs)) {
    return NextResponse.json({ error: 'Send a variant id and a frame delay between 50 and 1000 ms.' }, { status: 400 });
  }

  const variants = await readVariants();
  const target = variants.find((variant) => variant.id === body.id);
  if (!target) return NextResponse.json({ error: `No variant called "${body.id}".` }, { status: 404 });

  const frameDelayMs = body.frameDelayMs;
  const source = await decodeGifFrames(new Uint8Array(await readFile(toDiskPath(target.animation))));
  // A new file name per speed, so the browser does not show a previous speed from its cache.
  const animation = `${VARIANTS_PUBLIC_DIR}/${target.id}-fog-${frameDelayMs}ms.gif`;
  await writeAsset(animation, encodeGif(source, frameDelayMs));

  const updated: FogVariant = {
    ...target,
    animation,
    frameDelayMs,
    passMs: source.frames.length * frameDelayMs,
  };
  await writeVariants(variants.map((variant) => (variant.id === target.id ? updated : variant)));

  return NextResponse.json({ variant: updated });
}
