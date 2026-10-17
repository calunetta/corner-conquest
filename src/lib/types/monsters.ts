import type { MonsterName } from './monsters.generated';

export { MonsterName } from './monsters.generated';

export type Monster = {
  name: MonsterName;
  level: number;
  sprite: {
    idle: string;
    attack: string;
    death: string;
  };
};
