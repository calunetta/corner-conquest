import type { MonsterName } from './monsters.generated';

export { MonsterName } from './monsters.generated';

export type Monster = {
  name: MonsterName;
  level: number;
  /** Boss monsters are drawn 50% larger (see BOSS_MONSTER_SCALE). Optional so older saved state still reads. */
  isBoss?: boolean;
  sprite: {
    idle: string;
    attack?: string; // undefined when the catalog entry has no uploaded attack.gif
    death: string;
  };
};
