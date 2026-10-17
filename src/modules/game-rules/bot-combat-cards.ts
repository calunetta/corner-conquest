import type { Monster, Player } from '@/lib/types';
import { CardName } from '@/lib/types';
import { attackerWinProbability } from './bot-combat-odds';

/** War Chief is worth spending only when the fight is close: win probability within this distance of 50%. */
const WAR_CHIEF_MAX_SWING = 0.2;
/** Overcome (auto-win) is worth spending only on a fight the bot is likely to lose. */
const OVERCOME_MAX_WIN_PROBABILITY = 0.3;
/** Overcome is also spent on a monster this strong, even off the bot's own base. */
const OVERCOME_MIN_MONSTER_LEVEL = 3;

function isCloseFight(winProbability: number): boolean {
  return Math.abs(winProbability - 0.5) <= WAR_CHIEF_MAX_SWING;
}

/** Which combat cards the bot spends on a player-vs-player roll, decided from the dice odds. */
export function choosePlayerCombatCards(attacker: Player, defender: Player, onOwnBase: boolean) {
  const winProbability = attackerWinProbability(attacker.attackPower + 1, defender.attackPower + 1);
  return {
    useWarChief: attacker.specialCards.includes(CardName.WarChief) && isCloseFight(winProbability),
    useOvercome: attacker.specialCards.includes(CardName.Overcome) && winProbability < OVERCOME_MAX_WIN_PROBABILITY && onOwnBase,
  };
}

/** Which combat cards the bot spends on a player-vs-monster roll. Decide Dice Roll is always used when held. */
export function chooseMonsterCombatCards(attacker: Player, monster: Monster, onOwnBase: boolean) {
  const winProbability = attackerWinProbability(attacker.attackPower + 1, monster.level);
  const isStrongMonster = monster.level >= OVERCOME_MIN_MONSTER_LEVEL;
  return {
    useDecideCard: attacker.specialCards.includes(CardName.DecideDiceRoll),
    useOvercomeCard: attacker.specialCards.includes(CardName.Overcome) && winProbability < OVERCOME_MAX_WIN_PROBABILITY && (onOwnBase || isStrongMonster),
    useWarChief: attacker.specialCards.includes(CardName.WarChief) && isCloseFight(winProbability),
  };
}
