import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isTileVariantsConfig, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import {
  applyColors,
  isTileVariantsEdit,
  validateTileVariantsEdit,
} from '@/modules/map/components/TileVariants/TileVariants.validate';

// Dev-only, like the other testbed routes: writes tile-variants.config.json, which is never deployed to the game build.
const CONFIG_PATH = 'src/modules/map/components/TileVariants/tile-variants.config.json';

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  const body = (await request.json()) as { edit?: unknown };
  if (!isTileVariantsEdit(body.edit)) {
    return NextResponse.json({ error: 'The edit has an unknown slot, colour or malformed value.' }, { status: 400 });
  }

  const configPath = path.join(process.cwd(), CONFIG_PATH);
  const current: unknown = JSON.parse(await readFile(configPath, 'utf-8'));
  if (!isTileVariantsConfig(current)) {
    return NextResponse.json({ error: 'tile-variants.config.json is malformed.' }, { status: 500 });
  }

  const config: TileVariantsConfig = { variants: current.variants, selected: current.selected };
  const problem = validateTileVariantsEdit(config, body.edit);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const selected = Object.fromEntries(
    Object.entries(body.edit.selected).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== ''),
  );
  const next = { variants: applyColors(config.variants, body.edit.colors), selected };
  await writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`);

  return NextResponse.json({ ok: true });
}
