import type { Army, GameState, Player, ResourceType } from '@/lib/types';
import { CardName, GameStatus } from '@/lib/types';
import { pushLogEntry } from './log-entry';
import { clearCollectedPositions } from './resource-collection';
import { applyCollectorAbility, applyDeferredReclaim, applyExplorerAbility } from './turn-start-passives.reducer';

const DEATH_ANIMATION_DURATION_MS = 2000;
const REVEAL_ANIMATION_DURATION_MS = 1400;

/**
 * Collects resources from all of a player's positioned armies, then clears each collected spot's
 * position so the army must be re-positioned to collect again next turn (it does not auto-renew).
 */
function applyAutomaticCollection(state: GameState, player: Player): GameState {
  const collectedResources: Partial<Record<ResourceType, number>> = {};
  const collectedPositions: typeof player.positions = [];

  player.positions.forEach((pos) => {
    const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
    const resourceSpot = tile?.resources.find((r) => r.type === pos.resource);
    if (resourceSpot) {
      player.resources[resourceSpot.type] += resourceSpot.amount;
      collectedResources[resourceSpot.type] = (collectedResources[resourceSpot.type] || 0) + resourceSpot.amount;
      collectedPositions.push(pos);
    }
  });

  clearCollectedPositions(state, player, collectedPositions);

  const collectedStrings = Object.entries(collectedResources).map(([type, amount]) => `${amount} ${type}`);
  if (collectedStrings.length > 0) {
    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name} automatically collected ${collectedStrings.join(', ')}.`,
      playerId: player.playerId,
      isPassive: true,
      resourcesCollected: collectedResources,
    });
  }

  return state;
}

/** Rotates to the next non-sabotaged player, applies their passive abilities and auto-collection, checks for a win. */
export function handleEndTurn(state: GameState): GameState {
  if (state.players.length === 0) return state;

  if (state.currentPlayerIndex >= state.players.length) {
    state.currentPlayerIndex = 0;
  }

  applyDeferredReclaim(state);

  let attempts = 0;
  let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.currentPlayerIndex = nextPlayerIndex;
  let nextPlayer = state.players[nextPlayerIndex];

  while (nextPlayer.isSabotaged && attempts < state.players.length) {
    nextPlayer.isSabotaged = false;
    pushLogEntry(state, {
      category: 'turn',
      message: `${nextPlayer.name}'s turn was skipped due to Sabotage!`,
      playerId: nextPlayer.playerId,
      isPassive: true,
    });
    nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.currentPlayerIndex = nextPlayerIndex;
    nextPlayer = state.players[nextPlayerIndex];
    attempts++;
    if (state.currentPlayerIndex === 0) {
      state.turn += 1;
    }
  }

  nextPlayer.armies.forEach((army: Army) => (army.hasActed = false));
  nextPlayer.actionsThisTurn = [];
  nextPlayer.hasExtraMove = false;
  nextPlayer.efficientActive = false;
  nextPlayer.masterBuilderActive = false;
  nextPlayer.reinforceActive = false;

  if (state.currentPlayerIndex === 0 && attempts === 0) {
    state.turn += 1;
  }

  applyExplorerAbility(state, nextPlayer);
  applyCollectorAbility(state, nextPlayer);

  const positionedArmies = nextPlayer.positions;

  if (positionedArmies.length > 0) {
    if (nextPlayer.specialCards.includes(CardName.Productive)) {
      state.productiveDialogState = { playerId: nextPlayer.id };
    } else {
      state = applyAutomaticCollection(state, nextPlayer);
    }
  }

  if (nextPlayer.victoryPoints >= state.settings.victoryPointGoal && !state.winner) {
    state.winner = nextPlayer;
    state.status = GameStatus.Finished;
    pushLogEntry(state, {
      category: 'turn',
      message: `🎉 ${nextPlayer.name} has reached ${nextPlayer.victoryPoints} Victory Points and won the game!`,
      playerId: nextPlayer.playerId,
      isMilestone: true,
    });
  }

  pushLogEntry(state, {
    category: 'turn',
    message: `It's now ${nextPlayer.name}'s turn.`,
    playerId: nextPlayer.playerId,
    isPassive: true,
  });

  state.combatState = null;
  state.monsterCombatState = null;
  if (state.deathAnimations && state.deathAnimations.length > 0) {
    const now = Date.now();
    state.deathAnimations = state.deathAnimations.filter(
      (anim) => anim.createdAt && now - anim.createdAt < DEATH_ANIMATION_DURATION_MS,
    );
  }
  if (state.cardRevealAnimations && state.cardRevealAnimations.length > 0) {
    const now = Date.now();
    state.cardRevealAnimations = state.cardRevealAnimations.filter(
      (anim) => anim.createdAt && now - anim.createdAt < REVEAL_ANIMATION_DURATION_MS,
    );
  }

  return state;
}
