import { MONSTER_CATALOG } from '../../src/modules/game-rules';

/** Level per monster name, read from the catalog so monsters added later are covered too. */
export const MONSTER_LEVEL: Readonly<Record<string, number>> = Object.fromEntries(
  MONSTER_CATALOG.map((entry) => [entry.name, entry.level]),
);
