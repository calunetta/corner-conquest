// Reads and writes fog-variants.config.json and maps its public paths to files on disk. Server only.
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { FogVariant } from '@/modules/map/components/TileFog/TileFog.config';

const CONFIG_PATH = 'src/modules/map/components/TileFog/fog-variants.config.json';
export const VARIANTS_PUBLIC_DIR = '/sprites/fog-variants';

export async function readVariants(): Promise<FogVariant[]> {
  const config = JSON.parse(await readFile(path.join(process.cwd(), CONFIG_PATH), 'utf-8')) as {
    variants: FogVariant[];
  };
  return config.variants;
}

export async function writeVariants(variants: FogVariant[]): Promise<void> {
  await writeFile(path.join(process.cwd(), CONFIG_PATH), `${JSON.stringify({ variants }, null, 2)}\n`);
}

/** Writes a file under public/ at the given public path, creating its folder if needed. */
export async function writeAsset(publicPath: string, bytes: Uint8Array): Promise<void> {
  const diskPath = toDiskPath(publicPath);
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, bytes);
}

/** Public path (e.g. /sprites/fog-keyed.gif) to the file it is served from. */
export function toDiskPath(publicPath: string): string {
  return path.join(process.cwd(), 'public', publicPath);
}
