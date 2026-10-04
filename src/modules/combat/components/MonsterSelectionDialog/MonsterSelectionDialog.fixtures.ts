import type { Monster, MonsterSelectionDialogState } from '@/lib/types';
import { MonsterName } from '@/lib/types';

// Sprite paths copied from the real data source, src/modules/game-rules/monster-catalog.ts's
// MONSTER_DATA, not invented — a wrong path 404s silently in the preview.
const lancer: Monster = {
  name: MonsterName.Lancer,
  level: 1,
  sprite: { idle: '/sprites/lancer_idle.gif', attack: '/sprites/lancer_attack.gif', death: '/sprites/death.gif' },
};

const ogre: Monster = {
  name: MonsterName.Ogre,
  level: 3,
  sprite: { idle: '/sprites/ogre_idle.gif', attack: '/sprites/ogre_attack.gif', death: '/sprites/death.gif' },
};

const minotaur: Monster = {
  name: MonsterName.Minotaur,
  level: 4,
  sprite: { idle: '/sprites/minotaur_idle.gif', attack: '/sprites/minotaur_attack.gif', death: '/sprites/death.gif' },
};

/** A single monster to engage. */
export const singleMonsterState: MonsterSelectionDialogState = {
  monsters: [lancer],
  attackingArmyId: 0,
};

/** Multiple monsters, mixed levels. */
export const multipleMonstersState: MonsterSelectionDialogState = {
  monsters: [lancer, ogre, minotaur],
  attackingArmyId: 0,
};

/** Not my turn: every button disabled. */
export const notMyTurnState = multipleMonstersState;
