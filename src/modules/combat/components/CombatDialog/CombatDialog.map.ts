import type { GameState } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { PLAYER_DATA } from '@/modules/game-rules';
import type { CombatDialogViewModel, CombatantViewModel } from './CombatDialog.types';

export function toCombatDialogViewModel(
  gameState: GameState,
  localPlayerId: number,
  isMyTurn: boolean,
): CombatDialogViewModel | null {
  const { combatState, players } = gameState;

  if (!combatState) return null;

  const { attackerId, defenderId, attackerRolls, defenderRolls, winnerId, phase } = combatState;
  const attacker = players[attackerId];
  const defender = players.find(p => p.id === defenderId);

  if (!defender) return null;

  const isAttacker = localPlayerId === attackerId;
  const isCombatOver = phase === 'results';
  const loserId = isCombatOver && winnerId !== null ? (winnerId === attackerId ? defenderId : attackerId) : null;

  const attackerSprite = isCombatOver && loserId === attackerId
    ? PLAYER_DATA[attacker.color].sprite.death
    : PLAYER_DATA[attacker.color].sprite.attack;
  const defenderSprite = isCombatOver && loserId === defenderId
    ? PLAYER_DATA[defender.color].sprite.death
    : PLAYER_DATA[defender.color].sprite.attack;

  const hasWarChiefCard = attacker.specialCards.includes(CardName.WarChief);
  const hasOvercomeCard = attacker.specialCards.includes(CardName.Overcome);
  const canPerformAction = isMyTurn && isAttacker;
  const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

  const attackerTotal = attackerRolls.reduce((a, b) => a + b, 0);
  const defenderTotal = defenderRolls.reduce((a, b) => a + b, 0);

  const attackerViewModel: CombatantViewModel = {
    name: attacker.name,
    color: attacker.color,
    sprite: attackerSprite,
    isWinner: winnerId === attackerId,
    rolls: attackerRolls,
    total: attackerTotal,
  };

  const defenderViewModel: CombatantViewModel = {
    name: defender.name,
    color: defender.color,
    sprite: defenderSprite,
    isWinner: winnerId === defenderId,
    rolls: defenderRolls,
    total: defenderTotal,
  };

  const winner = winnerId !== null ? { name: players[winnerId].name, color: players[winnerId].color } : null;

  return {
    phase,
    isCombatOver,
    attacker: attackerViewModel,
    defender: defenderViewModel,
    winner,
    canPerformAction,
    canSelectCard: phase === 'rolling' && canPerformAction && canUseCard && (hasOvercomeCard || hasWarChiefCard),
    hasOvercomeCard,
    hasWarChiefCard,
  };
}
