import type { Monster, MonsterSelectionDialogState } from '@/lib/types';
import { MonsterName } from '@/lib/types';
import { toMonsterSelectionViewModel } from './MonsterSelectionDialog.map';

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

describe('toMonsterSelectionViewModel', () => {
  it('returns null when state is null', () => {
    expect(toMonsterSelectionViewModel(null)).toBeNull();
  });

  it('returns an empty monsters array for an empty input', () => {
    const state: MonsterSelectionDialogState = { monsters: [], attackingArmyId: 0 };
    expect(toMonsterSelectionViewModel(state)?.monsters).toEqual([]);
  });

  it('maps a single monster to its view model', () => {
    const state: MonsterSelectionDialogState = { monsters: [lancer], attackingArmyId: 0 };
    const result = toMonsterSelectionViewModel(state);

    expect(result?.monsters).toEqual([
      {
        name: MonsterName.Lancer,
        sprite: '/sprites/lancer_idle.gif',
        label: `${MonsterName.Lancer} (Lvl 1)`,
        powerLabel: 'Power: 1 Dice',
      },
    ]);
  });

  it('maps multiple monsters, preserving order', () => {
    const state: MonsterSelectionDialogState = { monsters: [lancer, ogre], attackingArmyId: 0 };
    const result = toMonsterSelectionViewModel(state);

    expect(result?.monsters.map((m) => m.name)).toEqual([MonsterName.Lancer, MonsterName.Ogre]);
    expect(result?.monsters[1]).toEqual({
      name: MonsterName.Ogre,
      sprite: '/sprites/ogre_idle.gif',
      label: `${MonsterName.Ogre} (Lvl 3)`,
      powerLabel: 'Power: 3 Dice',
    });
  });

  it('does not fall back when a monster has no sprite set (legacy has no fallback)', () => {
    const noSpriteMonster = { ...lancer, sprite: { idle: '', attack: '', death: '' } };
    const state: MonsterSelectionDialogState = { monsters: [noSpriteMonster], attackingArmyId: 0 };
    expect(toMonsterSelectionViewModel(state)?.monsters[0].sprite).toBe('');
  });

  it('does not mutate the input state', () => {
    const state: MonsterSelectionDialogState = { monsters: [lancer, ogre], attackingArmyId: 0 };
    const stateCopy = JSON.parse(JSON.stringify(state));

    toMonsterSelectionViewModel(state);

    expect(state).toEqual(stateCopy);
  });
});
