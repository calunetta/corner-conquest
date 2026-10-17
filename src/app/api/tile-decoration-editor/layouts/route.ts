import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { gitBlobSha, readDevToolFile, saveDevToolFiles } from '@/lib/dev-tools/save-file';
import { NextResponse } from 'next/server';
import { DECORATION_LAYOUTS_CONFIG_PATH, DECORATION_SCENARIO_KEYS } from '@/modules/map/decoration-layouts.types';
import type { DecorationLayoutsConfig } from '@/modules/map/decoration-layouts.types';

// Dev-only: every request needs the dev tools password (see src/lib/dev-tools/access.ts).

function isCompleteDecorationLayoutsConfig(config: unknown): config is DecorationLayoutsConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const record = config as Record<string, unknown>;
  return DECORATION_SCENARIO_KEYS.every((key) => Array.isArray(record[key]) && record[key].length >= 1);
}

/** Returns the saved layouts and the sha the next save must send back. */
export async function GET(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const file = await readDevToolFile(DECORATION_LAYOUTS_CONFIG_PATH);
  return NextResponse.json({ config: JSON.parse(file.content), sha: file.sha });
}

/** Body `{ config, baseSha }`. Refused with 409 and the newer layouts when the saved file has moved on. */
export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const body = (await request.json()) as { config?: unknown; baseSha?: unknown };

  if (!isCompleteDecorationLayoutsConfig(body.config)) {
    return NextResponse.json({ error: 'Each scenario needs at least one layout.' }, { status: 400 });
  }

  const content = `${JSON.stringify(body.config, null, 2)}\n`;
  const result = await saveDevToolFiles({
    changes: [
      {
        path: DECORATION_LAYOUTS_CONFIG_PATH,
        content,
        baseSha: typeof body.baseSha === 'string' ? body.baseSha : undefined,
      },
    ],
    message: 'chore(decorations): update decoration layouts from the dev tools',
  });

  if (result.status === 'conflict') {
    const [conflict] = result.conflicts;
    return NextResponse.json(
      {
        error: 'The decoration layouts changed since you loaded them.',
        config: JSON.parse(conflict.currentContent ?? 'null'),
        sha: conflict.currentSha,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    sha: gitBlobSha(content),
    pullRequestUrl: result.status === 'saved' && result.pullRequest.url ? result.pullRequest.url : null,
  });
}
