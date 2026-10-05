import type { GameState } from '@/lib/types';
import { CardName, GameAction, ResourceType } from '@/lib/types';
import { pushLogEntry } from './log-entry';

const WEALTHY_GAIN_AMOUNT = 5;
const STEAL_RESOURCE_MAX_AMOUNT = 2;

/** Sabotages a target player, who will miss their next turn; discards the Sabotage card. */
export function handleSabotagePlayer(state: GameState, targetPlayerId: number): GameState {
  const player = state.players[state.currentPlayerIndex];
  const targetPlayer = state.players.find((p) => p.id === targetPlayerId);

  if (targetPlayer) {
    targetPlayer.isSabotaged = true;
    pushLogEntry(state, {
      category: 'cards',
      message: `${player.name} sabotaged ${targetPlayer.name}! They will miss their next turn.`,
      playerId: player.playerId,
      targetPlayerId: targetPlayer.playerId,
    });

    player.actionsThisTurn.push(GameAction.UseCard);
    const cardIndex = player.specialCards.indexOf(CardName.Sabotage);
    if (cardIndex > -1) {
      state.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
    }
  }
  return state;
}

/** Grants a flat amount of a chosen base resource (food/wood/gold); discards the Wealthy card. */
export function handleGainWealth(state: GameState, resource: ResourceType): GameState {
  const player = state.players[state.currentPlayerIndex];

  const validResources = [ResourceType.Food, ResourceType.Wood, ResourceType.Gold];
  if (!validResources.includes(resource)) {
    throw new Error(`Invalid resource type: ${resource}`);
  }

  player.resources[resource] = (player.resources[resource] || 0) + WEALTHY_GAIN_AMOUNT;
  pushLogEntry(state, {
    category: 'cards',
    message: `${player.name} used 'Wealthy' to gain ${WEALTHY_GAIN_AMOUNT} ${resource}.`,
    playerId: player.playerId,
  });

  player.actionsThisTurn.push(GameAction.UseCard);
  const cardIndex = player.specialCards.indexOf(CardName.Wealthy);
  if (cardIndex > -1) {
    state.discardPile.push(player.specialCards.splice(cardIndex, 1)[0]);
  }

  return state;
}

/** Steals up to a capped amount of a resource from a target player; discards the Steal Resource card. */
export function handleStealResource(
  state: GameState,
  payload: { targetPlayerId: number; resource: ResourceType },
): GameState {
  const { players, currentPlayerIndex } = state;
  const currentPlayer = players[currentPlayerIndex];
  const targetPlayer = players.find((p) => p.id === payload.targetPlayerId);

  if (!targetPlayer) {
    return state;
  }

  const availableAmount = targetPlayer.resources[payload.resource] || 0;
  const stolenAmount = Math.min(availableAmount, STEAL_RESOURCE_MAX_AMOUNT);

  if (stolenAmount > 0) {
    targetPlayer.resources[payload.resource] -= stolenAmount;
    currentPlayer.resources[payload.resource] = (currentPlayer.resources[payload.resource] || 0) + stolenAmount;
    pushLogEntry(state, {
      category: 'cards',
      message: `${currentPlayer.name} stole ${stolenAmount} ${payload.resource} from ${targetPlayer.name}!`,
      playerId: currentPlayer.playerId,
      targetPlayerId: targetPlayer.playerId,
    });
  } else {
    pushLogEntry(state, {
      category: 'cards',
      message: `${currentPlayer.name} tried to steal ${payload.resource} from ${targetPlayer.name}, but they had none.`,
      playerId: currentPlayer.playerId,
      targetPlayerId: targetPlayer.playerId,
    });
  }

  currentPlayer.actionsThisTurn.push(GameAction.UseCard);
  const cardIndex = currentPlayer.specialCards.indexOf(CardName.StealResource);
  if (cardIndex > -1) {
    state.discardPile.push(currentPlayer.specialCards.splice(cardIndex, 1)[0]);
  }

  return state;
}
