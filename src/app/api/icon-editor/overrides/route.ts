import { denyUnlessDevToolsAccess } from '@/lib/dev-tools/access';
import { gitBlobSha, readDevToolFile, saveDevToolFiles } from '@/lib/dev-tools/save-file';
import { NextResponse } from 'next/server';
import { ICON_OVERRIDES_CONFIG_PATH } from '@/modules/icons';
import type { IconOverride, IconOverridesConfig } from '@/modules/icons';

// Dev-only: every request needs the dev-tools token (see src/lib/dev-tools/access.ts).

const ICON_OVERRIDE_KEYS = new Set(['src', 'rotation', 'size']);

function isIconOverride(value: unknown): value is IconOverride {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const override = value as Record<string, unknown>;
  if (!Object.keys(override).every((key) => ICON_OVERRIDE_KEYS.has(key))) return false;
  if ('src' in override && typeof override.src !== 'string') return false;
  if ('rotation' in override && typeof override.rotation !== 'number') return false;
  if ('size' in override && typeof override.size !== 'number') return false;

  return true;
}

function isIconOverridesConfig(value: unknown): value is IconOverridesConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value as Record<string, unknown>).every(isIconOverride);
}

/** Returns the saved overrides and the sha the next save must send back. */
export async function GET(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  const file = await readDevToolFile(ICON_OVERRIDES_CONFIG_PATH);
  return NextResponse.json({ overrides: JSON.parse(file.content), sha: file.sha });
}

/** Body `{ overrides, baseSha }`. Refused with 409 and the newer overrides when the saved file has moved on. */
export async function POST(request: Request): Promise<Response> {
  const denied = denyUnlessDevToolsAccess(request);
  if (denied) return denied;

  let body: { overrides?: unknown; baseSha?: unknown };
  try {
    body = (await request.json()) as { overrides?: unknown; baseSha?: unknown };
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  if (!isIconOverridesConfig(body.overrides)) {
    return NextResponse.json({ error: 'Invalid icon overrides payload.' }, { status: 400 });
  }

  const content = `${JSON.stringify(body.overrides, null, 2)}\n`;
  const result = await saveDevToolFiles({
    changes: [
      {
        path: ICON_OVERRIDES_CONFIG_PATH,
        content,
        baseSha: typeof body.baseSha === 'string' ? body.baseSha : undefined,
      },
    ],
    message: 'chore(icons): update icon overrides from the dev tools',
  });

  if (result.status === 'conflict') {
    const [conflict] = result.conflicts;
    return NextResponse.json(
      {
        error: 'The icon overrides changed since you loaded them.',
        overrides: JSON.parse(conflict.currentContent ?? 'null'),
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
