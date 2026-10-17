import type { MonsterName } from '@/lib/types';

export interface MonsterCatalogEntry {
  name: MonsterName;
  level: 1 | 2 | 3 | 4;
  isBoss: boolean;
  sprite: {
    idle: string;
    /** A missing -attack.gif is a valid entry: the monster has no attack animation. */
    attack?: string;
  };
}
