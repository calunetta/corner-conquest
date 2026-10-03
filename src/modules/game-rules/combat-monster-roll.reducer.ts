import type { GameState, Monster } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { rollDice } from './dice';

const WAR_CHIEF_BONUS_POWER = 2;
const DECIDE_DICE_MIN = 1;
const DECIDE_DICE_MAX = 6;

/** Rolls dice for a player-vs-monster combat, applying Overcome/War Chief/Decide-Dice-Roll cards. */
export function handleMonsterCombatRoll(
  state: GameState,
  payload: {
    monster: Monster;
    useDecideCard: boolean;
    decidedValue: number;
    useOvercomeCard: boolean;
    useWarChief: boolean;
  },
): GameState {
  const { players, currentPlayerIndex, discardPile, monsterCombatState } = state;
  if (!monsterCombatState) return state;

  const attacker = players[currentPlayerIndex];
  const attackingArmy = attacker.armies.find(
    (a) => a.position.x === monsterCombatState.attackerPosition.x && a.position.y === monsterCombatState.attackerPosition.y,
  );
  if (!attackingArmy) return state;

  attackingArmy.hasActed = true;
  if (attacker.hasExtraMove) {
    attacker.hasExtraMove = false;
    state.log.push(`${attacker.name} used their Extra Move in monster battle.`);
  }

  const { monster, useDecideCard, decidedValue, useOvercomeCard, useWarChief } = payload;

  let attackerRolls: number[] = [];
  let monsterRolls: number[] = [];
  let winnerId: number | null = null;

  let cardUsedThisAction = false;
  const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

  if (useOvercomeCard && canUseCard) {
    const cardIndex = attacker.specialCards.indexOf(CardName.Overcome);
    if (cardIndex > -1) {
      cardUsedThisAction = true;
      winnerId = attacker.id;
      state.log.push(`${attacker.name} used the '${CardName.Overcome}' card to win automatically!`);
      discardPile.push(attacker.specialCards.splice(cardIndex, 1)[0]);
    } else {
      throw new Error('Overcome card not found, but was attempted to be used.');
    }
  }

  if (winnerId === null) {
    let attackerBonusPower = 0;

    if (useWarChief && canUseCard && !cardUsedThisAction) {
      const cardIndex = attacker.specialCards.indexOf(CardName.WarChief);
      if (cardIndex > -1) {
        cardUsedThisAction = true;
        attackerBonusPower += WAR_CHIEF_BONUS_POWER;
        state.log.push(`${attacker.name} used '${CardName.WarChief}' for +2 power!`);
        discardPile.push(attacker.specialCards.splice(cardIndex, 1)[0]);
      }
    }

    let canUseDecideCard = useDecideCard;
    if (useDecideCard && canUseCard && !cardUsedThisAction) {
      const cardIndex = attacker.specialCards.indexOf(CardName.DecideDiceRoll);
      if (cardIndex > -1) {
        cardUsedThisAction = true;
        state.log.push(`${attacker.name} used the '${CardName.DecideDiceRoll}' card!`);
        discardPile.push(attacker.specialCards.splice(cardIndex, 1)[0]);
      } else {
        canUseDecideCard = false;
      }
    } else if (useDecideCard) {
      canUseDecideCard = false;
    }

    attackerRolls = rollDice(attacker.attackPower + 1 + attackerBonusPower);
    if (canUseDecideCard) {
      const safeDecidedValue = Math.max(DECIDE_DICE_MIN, Math.min(DECIDE_DICE_MAX, decidedValue || DECIDE_DICE_MAX));
      attackerRolls[0] = safeDecidedValue;
    }

    const monsterDiceCount = Math.max(1, monster.level);
    monsterRolls = rollDice(monsterDiceCount);
    const attackerScore = attackerRolls.reduce((a, b) => a + b, 0);
    const monsterScore = monsterRolls.reduce((a, b) => a + b, 0);
    winnerId = attackerScore > monsterScore ? attacker.id : null;
  }

  if (cardUsedThisAction) {
    attacker.actionsThisTurn.push(GameAction.UseCard);
  }

  state.monsterCombatState = {
    ...monsterCombatState,
    monster,
    attackerRolls,
    monsterRolls,
    winnerId,
    phase: 'results',
  };
  return state;
}
