export const MonsterName = {
  Lancer: 'Lancer',
  Bear: 'Bear',
  Ogre: 'Ogre',
  Minotaur: 'Minotaur',
} as const;
export type MonsterName = (typeof MonsterName)[keyof typeof MonsterName];

export type Monster = {
  name: MonsterName;
  level: number;
  sprite: {
    idle: string;
    attack: string;
    death: string;
  };
};
