import { writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { ICON_OVERRIDES_CONFIG_PATH } from '@/modules/icons';
import type { IconOverride, IconOverridesConfig } from '@/modules/icons';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem writes) — see plan.md's Decisions.

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

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  let body: { overrides?: unknown };
  try {
    body = (await request.json()) as { overrides?: unknown };
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  if (!isIconOverridesConfig(body.overrides)) {
    return NextResponse.json({ error: 'Invalid icon overrides payload.' }, { status: 400 });
  }

  await writeFile(
    path.join(process.cwd(), ICON_OVERRIDES_CONFIG_PATH),
    JSON.stringify(body.overrides, null, 2),
  );

  return NextResponse.json({ ok: true });
}
