import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildMonsterCatalogEntries,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from '../src/modules/game-rules/monster-catalog-generator';

const projectRoot = path.resolve(__dirname, '..');
const monsterDirectory = path.join(projectRoot, 'public', 'monster');
const catalogOutput = path.join(projectRoot, 'src/modules/game-rules/monster-catalog.generated.ts');
const namesOutput = path.join(projectRoot, 'src/lib/types/monsters.generated.ts');

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
