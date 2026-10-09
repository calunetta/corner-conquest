import type { GameState } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { rollDice } from './dice';
import { pushLogEntry } from './log-entry';

const WAR_CHIEF_BONUS_POWER = 2;

/** Rolls dice for a player-vs-player combat, applying War Chief/Overcome cards if requested. */
export function handleCombatRoll(
  state: GameState,
  payload: { useWarChief?: boolean; useOvercome?: boolean } | boolean,
): GameState {
  if (!state.combatState) return state;

  const useWarChief = typeof payload === 'object' ? !!payload.useWarChief : !!payload;
  const useOvercome = typeof payload === 'object' ? !!payload.useOvercome : false;

  const { combatState, players, discardPile } = state;
  const attacker = players[combatState.attackerId];
  const defender = players.find((p) => p.id === combatState.defenderId);
  if (!defender) return state;

  const attackingArmy = attacker.armies.find((a) => a.id === combatState.attackingArmyId);
  if (!attackingArmy) return state;

  // An Extra Move bonus attack leaves hasActed untouched, so an army that had not acted keeps its normal action.
  if (attacker.hasExtraMove) {
    attacker.hasExtraMove = false;
    pushLogEntry(state, {
      category: 'combat',
      message: `${attacker.name} used their Extra Move in battle.`,
      playerId: attacker.playerId,
    });
  } else {
    attackingArmy.hasActed = true;
  }

  const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

  if (useOvercome && canUseCard) {
    const cardIndex = attacker.specialCards.indexOf(CardName.Overcome);
    if (cardIndex > -1) {
      attacker.actionsThisTurn.push(GameAction.UseCard);
      const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
      discardPile.push(usedCard);
      pushLogEntry(state, {
        category: 'combat',
        message: `${attacker.name} used 'Overcome' to win the battle automatically!`,
        playerId: attacker.playerId,
      });
      combatState.attackerRolls = [6, 6];
      combatState.defenderRolls = [1];
      combatState.winnerId = combatState.attackerId;
      combatState.phase = 'results';
      return state;
    }
  }

  let warChiefApplied = false;
  if (useWarChief && canUseCard) {
    const cardIndex = attacker.specialCards.indexOf(CardName.WarChief);
    if (cardIndex > -1) {
      attacker.actionsThisTurn.push(GameAction.UseCard);
      warChiefApplied = true;
      pushLogEntry(state, {
        category: 'combat',
        message: `${attacker.name} used 'War Chief' for +2 to combat score!`,
        playerId: attacker.playerId,
      });
      const usedCard = attacker.specialCards.splice(cardIndex, 1)[0];
      discardPile.push(usedCard);
    }
  }

  combatState.attackerRolls = rollDice(attacker.attackPower + 1);
  combatState.defenderRolls = rollDice(defender.attackPower + 1);

  const attackerScore = combatState.attackerRolls.reduce((a, b) => a + b, 0) + (warChiefApplied ? WAR_CHIEF_BONUS_POWER : 0);
  const defenderScore = combatState.defenderRolls.reduce((a, b) => a + b, 0);

  combatState.winnerId = attackerScore > defenderScore ? combatState.attackerId : combatState.defenderId;
  combatState.phase = 'results';

  return state;
}
