import { writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isFogTiming } from '@/modules/map/components/TileFog/TileFog.config';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem writes), same as the tile decoration editor routes.
const FOG_TIMING_CONFIG_PATH = 'src/modules/map/components/TileFog/fog-timing.config.json';

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const body = (await request.json()) as { timing?: unknown };
  if (!isFogTiming(body.timing)) {
    return NextResponse.json({ error: 'The fog timing is missing a field or a value is out of range.' }, { status: 400 });
  }

  const { fadeStartMs, fadeMs, scale, offsetXPct, offsetYPct, revealDelayMs, revealFadeMs } = body.timing;
  const json = JSON.stringify(
    { fadeStartMs, fadeMs, scale, offsetXPct, offsetYPct, revealDelayMs, revealFadeMs },
    null,
    2,
  );
  await writeFile(path.join(process.cwd(), FOG_TIMING_CONFIG_PATH), `${json}\n`);

  return NextResponse.json({ ok: true });
}
