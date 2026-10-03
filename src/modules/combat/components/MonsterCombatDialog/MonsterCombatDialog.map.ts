import type { GameState, PlayerColor } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { PLAYER_DATA } from '@/modules/game-rules';
import type {
  MonsterAttackViewModel,
  MonsterCombatScreen,
  MonsterCombatViewModel,
  MonsterResultsViewModel,
  MonsterSpectatorViewModel,
} from './MonsterCombatDialog.types';

export function toMonsterCombatViewModel(
  gameState: GameState,
  isMyTurn: boolean,
  localPlayerId?: number,
): MonsterCombatViewModel | null {
  const { monsterCombatState, players } = gameState;

  if (!monsterCombatState) return null;

  const { attackerId, attackerRolls, monsterRolls, winnerId, phase, monster } = monsterCombatState;
  const attacker = players[attackerId];
  const isAttacker = localPlayerId !== undefined ? localPlayerId === attackerId : isMyTurn;

  let screen: MonsterCombatScreen;

  // Screen selection order: results first regardless of isAttacker, then spectator, then attack
  if (phase === 'results') {
    screen = {
      kind: 'results',
      data: toMonsterResultsViewModel(attacker, monster, attackerRolls, monsterRolls, winnerId),
    };
  } else if (!isAttacker) {
    screen = {
      kind: 'spectator',
      data: toMonsterSpectatorViewModel(attacker, monster),
    };
  } else {
    const hasDecideCard = attacker.specialCards.includes(CardName.DecideDiceRoll);
    const hasOvercomeCard = attacker.specialCards.includes(CardName.Overcome);
    const hasWarChiefCard = attacker.specialCards.includes(CardName.WarChief);
    const canUseCard = !attacker.actionsThisTurn.includes(GameAction.UseCard);

    screen = {
      kind: 'attack',
      data: toMonsterAttackViewModel(
        attacker,
        monster,
        hasDecideCard,
        hasOvercomeCard,
        hasWarChiefCard,
        canUseCard,
      ),
    };
  }

  return {
    isAttacker,
    screen,
  };
}

function toMonsterAttackViewModel(
  attacker: { id: number; name: string; color: PlayerColor; attackPower: number },
  monster: { name: string; level: number; sprite: { attack: string } } | undefined,
  hasDecideCard: boolean,
  hasOvercomeCard: boolean,
  hasWarChiefCard: boolean,
  canUseCard: boolean,
): MonsterAttackViewModel {
  const attackerSprite = PLAYER_DATA[attacker.color].sprite.attack;
  const hasAnyCard = canUseCard && (hasDecideCard || hasOvercomeCard || hasWarChiefCard);
  const attackerPower = attacker.attackPower + 1;
  const monsterPower = monster?.level ?? 0;

  return {
    title: monster ? `Monster Encounter: ${monster.name} (Lvl ${monster.level})` : 'Monster Encounter',
    attackerName: attacker.name,
    attackerColor: attacker.color,
    attackerSprite,
    attackerPowerLabel: `Power: ${attackerPower} (${attackerPower === 1 ? '1 Die' : `${attackerPower} Dice`})`,
    monster: monster
      ? {
          name: monster.name,
          sprite: monster.sprite.attack,
          powerLabel: `Power: ${monsterPower} (${monsterPower === 1 ? '1 Die' : `${monsterPower} Dice`})`,
        }
      : null,
    canSelectCard: hasAnyCard,
    hasDecideCard: hasAnyCard && hasDecideCard,
    hasOvercomeCard: hasAnyCard && hasOvercomeCard,
    hasWarChiefCard: hasAnyCard && hasWarChiefCard,
    canAttack: !!monster,
  };
}

function toMonsterResultsViewModel(
  attacker: { id: number; name: string; color: PlayerColor },
  monster: { name: string; sprite: { death: string; attack: string } } | undefined,
  attackerRolls: number[],
  monsterRolls: number[],
  winnerId: number | null,
): MonsterResultsViewModel {
  const isPlayerWinner = winnerId === attacker.id;
  const attackerTotal = attackerRolls.reduce((a, b) => a + b, 0);
  const monsterTotal = monsterRolls.reduce((a, b) => a + b, 0);

  const attackerSprite = isPlayerWinner
    ? PLAYER_DATA[attacker.color].sprite.attack
    : PLAYER_DATA[attacker.color].sprite.death;
  const monsterSprite = monster
    ? isPlayerWinner
      ? monster.sprite.death
      : monster.sprite.attack
    : null;

  const outcomeText = isPlayerWinner
    ? `${attacker.name} Defeated the Monster!`
    : 'The Monster prevailed!';

  return {
    isPlayerWinner,
    attacker: {
      name: attacker.name,
      color: attacker.color,
      sprite: attackerSprite,
      rolls: attackerRolls,
      total: attackerTotal,
      isWinner: isPlayerWinner,
    },
    monster: monster
      ? {
          name: monster.name,
          sprite: monsterSprite,
          rolls: monsterRolls,
          total: monsterTotal,
          isWinner: !isPlayerWinner,
        }
      : null,
    outcomeText,
  };
}

function toMonsterSpectatorViewModel(
  attacker: { name: string },
  monster: { name: string; level: number } | undefined,
): MonsterSpectatorViewModel {
  const monsterLabel = monster ? `${monster.name} (Lvl ${monster.level})` : 'the monster';

  return {
    attackerName: attacker.name,
    monsterLabel,
  };
}
