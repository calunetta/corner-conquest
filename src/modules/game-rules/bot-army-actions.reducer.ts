import type { Army, GameState } from '@/lib/types';
import { GameAction } from '@/lib/types';
import type { BotAction } from './bot-helpers';
import { findAvailableResourceSpot, isArmyEligibleToPosition } from './army-position-eligibility';
import { getPossibleMoves } from './movement.reducer';
import { handleGameAction } from './game-rules.reducer';
import { choosePlayerCombatCards, chooseMonsterCombatCards } from './bot-combat-cards';
import {
  RESOURCE_SPOT_PRIORITY,
  isOwnBaseTile,
  scoreMonsterAttack,
  scoreMove,
  scorePlayerAttack,
} from './bot-action-scoring';

/** Rolls the active bot's pending combat (player or monster), spending the cards it chose. */
function resolvePendingCombat(state: GameState): GameState {
  let currentState = state;
  const bot = currentState.players[currentState.currentPlayerIndex];

  if (currentState.monsterCombatState && currentState.monsterCombatState.monster) {
    const { monster, attackerPosition } = currentState.monsterCombatState;
    const onOwnBase = isOwnBaseTile(currentState, bot, attackerPosition.x, attackerPosition.y);
    const cards = chooseMonsterCombatCards(bot, monster, onOwnBase);
    const rollRes = handleGameAction({
      action: GameAction.MonsterCombatRoll,
      gameState: currentState,
      payload: { monster, useDecideCard: cards.useDecideCard, decidedValue: 6, useOvercomeCard: cards.useOvercomeCard, useWarChief: cards.useWarChief },
    });
    if (rollRes.state) {
      const closeRes = handleGameAction({ action: GameAction.CloseMonsterCombat, gameState: rollRes.state });
      if (closeRes.state) currentState = closeRes.state;
    }
  } else if (currentState.combatState) {
    const combat = currentState.combatState;
    const defender = currentState.players.find((p) => p.id === combat.defenderId);
    const attackingArmy = bot.armies.find((a) => a.id === combat.attackingArmyId);
    if (defender && attackingArmy) {
      const onOwnBase = isOwnBaseTile(currentState, bot, attackingArmy.position.x, attackingArmy.position.y);
      const cards = choosePlayerCombatCards(bot, defender, onOwnBase);
      const rollRes = handleGameAction({
        action: GameAction.CombatRoll,
        gameState: currentState,
        payload: { useWarChief: cards.useWarChief, useOvercome: cards.useOvercome },
      });
      if (rollRes.state) {
        const closeRes = handleGameAction({ action: GameAction.CloseCombat, gameState: rollRes.state });
        if (closeRes.state) currentState = closeRes.state;
      }
    }
  }

  return currentState;
}

/**
 * Iterates through the active bot's unacted armies, scoring every possible action (attack,
 * resource positioning, move) and executing the single highest-scoring one per loop, until no
 * army has an unacted possible move left. Auto-resolves any combat the chosen action triggers.
 */
export function applyBotArmyActions(state: GameState): GameState {
  let currentState = state;
  const cols = currentState.settings.gridSize.cols;
  let activeBot = currentState.players[currentState.currentPlayerIndex];
  const maxArmyLoops = Math.max(1, activeBot.armies.length);

  for (let loop = 0; loop < maxArmyLoops; loop++) {
    activeBot = currentState.players[currentState.currentPlayerIndex];
    const unactedArmies = activeBot.armies.filter((a: Army) => !a.hasActed);
    if (unactedArmies.length === 0) break;

    const possibleActions: BotAction[] = [];

    for (const army of unactedArmies) {
      const currentTile = currentState.map[army.position.y * cols + army.position.x];
      const enemyOnTile = currentTile.occupants.find((o) => o.playerId !== activeBot.id);
      const monsterOnTile = currentTile.monsters && currentTile.monsters.length > 0 ? currentTile.monsters[0] : null;
      const onOwnBase = isOwnBaseTile(currentState, activeBot, army.position.x, army.position.y);

      if (enemyOnTile) {
        const enemyPlayer = currentState.players.find((p) => p.id === enemyOnTile.playerId);
        if (enemyPlayer) {
          possibleActions.push({
            name: `attack-player-${army.id}`,
            priority: scorePlayerAttack(activeBot, enemyPlayer, onOwnBase),
            action: GameAction.InitiateCombat,
            payload: {
              attackingArmyId: army.id,
              target: { type: 'player', defenderId: enemyPlayer.id, defendingArmyId: enemyOnTile.armyId },
            },
          });
        }
      }

      if (monsterOnTile) {
        possibleActions.push({
          name: `attack-monster-${army.id}`,
          priority: scoreMonsterAttack(activeBot, monsterOnTile),
          action: GameAction.InitiateCombat,
          payload: { attackingArmyId: army.id, target: { type: 'monster', monsterName: monsterOnTile.name } },
        });
      }

      if (isArmyEligibleToPosition(currentTile, activeBot, army.id)) {
        const availableResource = findAvailableResourceSpot(currentTile);
        if (availableResource) {
          possibleActions.push({
            name: `position-${army.id}`,
            priority: RESOURCE_SPOT_PRIORITY,
            action: GameAction.SelectResourcePosition,
            payload: { resource: availableResource.type, armyId: army.id },
          });
        }
      }

      for (const move of getPossibleMoves(currentState, army)) {
        possibleActions.push({
          name: `move-${army.id}-to-${move.x},${move.y}`,
          priority: scoreMove(currentState, activeBot, move.x, move.y),
          action: GameAction.Move,
          payload: { x: move.x, y: move.y, army },
        });
      }
    }

    if (possibleActions.length === 0) break;

    possibleActions.sort((a, b) => b.priority - a.priority);
    const bestAction = possibleActions[0];

    const actionRes = handleGameAction({ action: bestAction.action, gameState: currentState, payload: bestAction.payload });
    if (actionRes.state) {
      currentState = resolvePendingCombat(actionRes.state);
    } else {
      const firstUnacted = activeBot.armies.find((a) => !a.hasActed);
      if (firstUnacted) firstUnacted.hasActed = true;
    }
  }

  return currentState;
}
