import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  MONSTER_CATALOG_GENERATED_PATH,
  MONSTER_NAMES_GENERATED_PATH,
  MONSTER_SPRITE_PUBLIC_DIRECTORY_FS,
  buildMonsterCatalogEntries,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from '../src/modules/game-rules/monster-catalog-generator';

const projectRoot = path.resolve(__dirname, '..');
const monsterDirectory = path.join(projectRoot, MONSTER_SPRITE_PUBLIC_DIRECTORY_FS);
const catalogOutput = path.join(projectRoot, MONSTER_CATALOG_GENERATED_PATH);
const namesOutput = path.join(projectRoot, MONSTER_NAMES_GENERATED_PATH);

function listGifFilenames(): string[] {
  try {
    return readdirSync(monsterDirectory).filter((filename) => filename.toLowerCase().endsWith('.gif')).sort();
  } catch {
    // A missing folder is valid: the seed entries still make a complete catalog.
    return [];
  }
}

const entries = buildMonsterCatalogEntries(listGifFilenames());

writeFileSync(catalogOutput, renderMonsterCatalogSource(entries));
writeFileSync(namesOutput, renderMonsterNameSource(entries.map((entry) => entry.name)));
console.warn(`Wrote ${entries.length} monsters to the catalog and the MonsterName type.`);
