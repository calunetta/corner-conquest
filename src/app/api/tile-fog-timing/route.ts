import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { readDevToolFile, saveDevToolFiles } from '@/lib/dev-tools/save-file';
import { NextResponse } from 'next/server';
import { isFogTiming } from '@/modules/map/components/TileFog/TileFog.config';

// Dev-only: every request needs the dev tools password (see src/lib/dev-tools/access.ts).
const FOG_TIMING_CONFIG_PATH = 'src/modules/map/components/TileFog/fog-timing.config.json';

/** Body `{ timing, baseSha? }`. `baseSha` is the sha the editor loaded; a live save refuses to overwrite a newer version. */
export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const body = (await request.json()) as { timing?: unknown; baseSha?: unknown };
  if (!isFogTiming(body.timing)) {
    return NextResponse.json({ error: 'The fog timing is missing a field or a value is out of range.' }, { status: 400 });
  }

  const { fadeStartMs, fadeMs, scale, offsetXPct, offsetYPct, revealDelayMs, revealFadeMs } = body.timing;
  const json = JSON.stringify(
    { fadeStartMs, fadeMs, scale, offsetXPct, offsetYPct, revealDelayMs, revealFadeMs },
    null,
    2,
  );
  const result = await saveDevToolFiles({
    changes: [
      {
        path: FOG_TIMING_CONFIG_PATH,
        content: `${json}\n`,
        baseSha: typeof body.baseSha === 'string' ? body.baseSha : undefined,
      },
    ],
    message: 'chore(fog): update fog timing from the dev tools',
  });

  if (result.status === 'conflict') {
    const [conflict] = result.conflicts;
    return NextResponse.json(
      {
        error: 'The fog timing changed on the live branch since you loaded it. Reload to see the newer version.',
        currentContent: conflict.currentContent,
        currentSha: conflict.currentSha,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, result });
}

/** Returns the saved timing and its sha. The editor sends that sha back as `baseSha` when it saves. */
export async function GET(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const file = await readDevToolFile(FOG_TIMING_CONFIG_PATH);
  return NextResponse.json({ timing: JSON.parse(file.content), sha: file.sha });
}
