import type { Army, GameState } from '@/lib/types';
import { GameAction, IslandType } from '@/lib/types';
import type { BotAction } from './bot-helpers';
import { getPossibleMoves } from './movement.reducer';
import { handleGameAction } from './game-rules.reducer';

/**
 * Iterates through the active bot's unacted armies, scoring every possible action (attack,
 * resource positioning, move) and executing the single highest-priority one per loop, until no
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
      const monsterOnTile = currentTile.monsters && currentTile.monsters.length > 0;

      if (enemyOnTile) {
        const enemyPlayer = currentState.players.find((p) => p.id === enemyOnTile.playerId);
        if (enemyPlayer) {
          possibleActions.push({
            name: `attack-player-${army.id}`,
            priority: 8 + (activeBot.attackPower - enemyPlayer.attackPower),
            action: GameAction.InitiateCombat,
            payload: {
              attackingArmyId: army.id,
              target: { type: 'player', defenderId: enemyPlayer.id, defendingArmyId: enemyOnTile.armyId },
            },
          });
        }
      }

      if (monsterOnTile && currentTile.monsters && currentTile.monsters.length > 0) {
        possibleActions.push({
          name: `attack-monster-${army.id}`,
          priority: 7,
          action: GameAction.InitiateCombat,
          payload: { attackingArmyId: army.id, target: { type: 'monster', monsterName: currentTile.monsters[0].name } },
        });
      }

      const isAlreadyPositioned = activeBot.positions.some((p) => p.armyId === army.id);
      if (!isAlreadyPositioned && (currentTile.type === IslandType.Resource || currentTile.type === IslandType.Base) && currentTile.resources.length > 0 && !monsterOnTile) {
        const availableResource = currentTile.resources.find((res) => !(currentTile.positionedBy || []).some((p) => p.resource === res.type));
        if (availableResource) {
          possibleActions.push({
            name: `position-${army.id}`,
            priority: 9,
            action: GameAction.SelectResourcePosition,
            payload: { resource: availableResource.type, armyId: army.id },
          });
        }
      }

      const validMoves = getPossibleMoves(currentState, army);
      for (const move of validMoves) {
        const targetTile = currentState.map[move.y * cols + move.x];
        let priority = 2;
        if (currentState.settings.fogOfWar && !activeBot.revealedTiles.includes(targetTile.id)) {
          priority = 6;
        } else if ((targetTile.type === IslandType.Resource || targetTile.type === IslandType.Base) && targetTile.resources.length > 0 && targetTile.occupants.length === 0 && (!targetTile.monsters || targetTile.monsters.length === 0)) {
          priority = 4;
        } else if (targetTile.type === IslandType.Special) {
          priority = 3;
        }

        possibleActions.push({
          name: `move-${army.id}-to-${move.x},${move.y}`,
          priority,
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
      currentState = actionRes.state;

      if (currentState.monsterCombatState && currentState.monsterCombatState.monster) {
        const monster = currentState.monsterCombatState.monster;
        const rollRes = handleGameAction({
          action: GameAction.MonsterCombatRoll,
          gameState: currentState,
          payload: { monster, useDecideCard: false, decidedValue: 6, useOvercomeCard: false, useWarChief: false },
        });
        if (rollRes.state) {
          const closeRes = handleGameAction({ action: GameAction.CloseMonsterCombat, gameState: rollRes.state });
          if (closeRes.state) currentState = closeRes.state;
        }
      } else if (currentState.combatState) {
        const rollRes = handleGameAction({
          action: GameAction.CombatRoll,
          gameState: currentState,
          payload: { useWarChief: false, useOvercome: false },
        });
        if (rollRes.state) {
          const closeRes = handleGameAction({ action: GameAction.CloseCombat, gameState: rollRes.state });
          if (closeRes.state) currentState = closeRes.state;
        }
      }
    } else {
      const firstUnacted = activeBot.armies.find((a) => !a.hasActed);
      if (firstUnacted) firstUnacted.hasActed = true;
    }
  }

  return currentState;
}
