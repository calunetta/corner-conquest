import { writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { DECORATION_LAYOUTS_CONFIG_PATH, DECORATION_SCENARIO_KEYS } from '@/modules/map';
import type { DecorationLayoutsConfig } from '@/modules/map';

// Dev-only: this route must 404 in any deployed build, regardless of NEXT_PUBLIC_ENABLE_TESTBED
// (which only gates the testbed UI, not filesystem writes) — see plan.md's Decisions.

function isCompleteDecorationLayoutsConfig(config: unknown): config is DecorationLayoutsConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const record = config as Record<string, unknown>;
  return DECORATION_SCENARIO_KEYS.every((key) => Array.isArray(record[key]) && record[key].length >= 1);
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const body = (await request.json()) as { config?: unknown };

  if (!isCompleteDecorationLayoutsConfig(body.config)) {
    return NextResponse.json({ error: 'Each scenario needs at least one layout.' }, { status: 400 });
  }

  await writeFile(
    path.join(process.cwd(), DECORATION_LAYOUTS_CONFIG_PATH),
    JSON.stringify(body.config, null, 2),
  );

  return NextResponse.json({ ok: true });
}
