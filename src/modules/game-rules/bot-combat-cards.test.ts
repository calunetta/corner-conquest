import type { Monster, Player } from '@/lib/types';
import { CardName } from '@/lib/types';
import { chooseMonsterCombatCards, choosePlayerCombatCards } from './bot-combat-cards';

function botWith(attackPower: number, cards: CardName[]): Player {
  return { attackPower, specialCards: cards } as unknown as Player;
}

function monsterOfLevel(level: number): Monster {
  return { name: 'Lancer', level, sprite: { idle: '' } } as unknown as Monster;
}

describe('choosePlayerCombatCards', () => {
  it('spends War Chief in a close fight', () => {
    const attacker = botWith(1, [CardName.WarChief]);
    const defender = botWith(1, []);
    expect(choosePlayerCombatCards(attacker, defender, false).useWarChief).toBe(true);
  });

  it('keeps War Chief for a fight it is far from winning or losing', () => {
    const attacker = botWith(4, [CardName.WarChief]);
    const defender = botWith(0, []);
    expect(choosePlayerCombatCards(attacker, defender, false).useWarChief).toBe(false);
  });

  it('spends Overcome on a losing fight at the bot\'s own base', () => {
    const attacker = botWith(0, [CardName.Overcome]);
    const defender = botWith(3, []);
    expect(choosePlayerCombatCards(attacker, defender, true).useOvercome).toBe(true);
  });

  it('keeps Overcome for a losing fight away from its base', () => {
    const attacker = botWith(0, [CardName.Overcome]);
    const defender = botWith(3, []);
    expect(choosePlayerCombatCards(attacker, defender, false).useOvercome).toBe(false);
  });

  it('uses no card when the bot does not hold one', () => {
    const attacker = botWith(0, []);
    const defender = botWith(0, []);
    expect(choosePlayerCombatCards(attacker, defender, true)).toEqual({ useWarChief: false, useOvercome: false });
  });
});

describe('chooseMonsterCombatCards', () => {
  it('always uses Decide Dice Roll when held', () => {
    const attacker = botWith(4, [CardName.DecideDiceRoll]);
    expect(chooseMonsterCombatCards(attacker, monsterOfLevel(1), false).useDecideCard).toBe(true);
  });

  it('spends Overcome against a strong monster even away from its base', () => {
    const attacker = botWith(0, [CardName.Overcome]);
    expect(chooseMonsterCombatCards(attacker, monsterOfLevel(4), false).useOvercomeCard).toBe(true);
  });

  it('does not spend Overcome against a weak monster away from its base', () => {
    const attacker = botWith(0, [CardName.Overcome]);
    expect(chooseMonsterCombatCards(attacker, monsterOfLevel(1), false).useOvercomeCard).toBe(false);
  });
});
