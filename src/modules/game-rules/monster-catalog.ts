import type { Monster, MonsterName } from '@/lib/types';
import { MAP_COLS, MAP_ROWS, MonsterName as MonsterNameEnum } from '@/lib/types';

export const MONSTER_DATA: Record<number, { name: MonsterName; sprite: { idle: string; attack: string; death: string } }> = {
  1: { name: MonsterNameEnum.Lancer, sprite: { idle: '/sprites/lancer_idle.gif', attack: '/sprites/lancer_attack.gif', death: '/sprites/death.gif' } },
  2: { name: MonsterNameEnum.Bear, sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/death.gif' } },
  3: { name: MonsterNameEnum.Ogre, sprite: { idle: '/sprites/ogre_idle.gif', attack: '/sprites/ogre_attack.gif', death: '/sprites/death.gif' } },
  4: { name: MonsterNameEnum.Minotaur, sprite: { idle: '/sprites/minotaur_idle.gif', attack: '/sprites/minotaur_attack.gif', death: '/sprites/death.gif' } },
};

export function generateMonsters(x: number, y: number): Monster[] {
  const monsters: Monster[] = [];
  const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };
  const distance = Math.abs(x - center.x) + Math.abs(y - center.y);

  let possibleLevels: number[] = [];
  if (distance <= 1) { // Center
    possibleLevels = [3, 4];
  } else if (distance <= 3) { // Mid-ring
    possibleLevels = [1, 2, 3];
  } else { // Outer ring
    possibleLevels = [1, 2];
  }

  const hasBigMonster = possibleLevels.includes(3) || possibleLevels.includes(4) ? Math.random() < 0.3 : false;

  if (hasBigMonster) {
    const bigMonsterLevel = possibleLevels.includes(4) && Math.random() < 0.25 ? 4 : 3;
    const bigMonsterData = MONSTER_DATA[bigMonsterLevel];
    monsters.push({
      name: bigMonsterData.name,
      level: bigMonsterLevel,
      sprite: bigMonsterData.sprite,
    });

    const littleMonsterLevel = Math.random() < 0.6 ? 1 : 2;
    const littleMonsterData = MONSTER_DATA[littleMonsterLevel];
    monsters.push({
      name: littleMonsterData.name,
      level: littleMonsterLevel,
      sprite: littleMonsterData.sprite,
    });
  } else {
    const numMonsters = Math.random() < 0.7 ? 1 : 2;
    let availableLevels = possibleLevels.filter((l) => l <= 2);
    if (availableLevels.length === 0) availableLevels = [1];

    for (let i = 0; i < numMonsters; i++) {
      const level = availableLevels[Math.floor(Math.random() * availableLevels.length)];
      const monsterData = MONSTER_DATA[level];
      monsters.push({
        name: monsterData.name,
        level,
        sprite: monsterData.sprite,
      });
    }
  }

  // Prevent duplicate monsters on the same tile
  const uniqueMonsters = monsters.reduce((acc, current) => {
    if (!acc.find((item) => item.name === current.name)) {
      acc.push(current);
    }
    return acc;
  }, [] as Monster[]);

  return uniqueMonsters;
}
