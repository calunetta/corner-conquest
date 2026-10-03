import type { Army, GameState, Player } from '@/lib/types';
import { CardName, GameStatus, IslandType } from '@/lib/types';

const DEATH_ANIMATION_DURATION_MS = 2000;

/** Collects resources from all of a player's positioned armies, then clears those positions. */
function applyAutomaticCollection(state: GameState, player: Player): GameState {
  const collectedResources: Record<string, number> = {};

  player.positions.forEach((pos) => {
    const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
    const resourceSpot = tile?.resources.find((r) => r.type === pos.resource);
    if (resourceSpot) {
      player.resources[resourceSpot.type] += resourceSpot.amount;
      collectedResources[resourceSpot.type] = (collectedResources[resourceSpot.type] || 0) + resourceSpot.amount;
    }
  });

  const collectedStrings = Object.entries(collectedResources).map(([type, amount]) => `${amount} ${type}`);
  if (collectedStrings.length > 0) {
    state.log.push(`${player.name} automatically collected ${collectedStrings.join(', ')}.`);
  }

  player.positions.forEach((pos) => {
    const tile = state.map[pos.y * state.settings.gridSize.cols + pos.x];
    if (tile && tile.positionedBy) {
      tile.positionedBy = tile.positionedBy.filter((p) => !(p.playerId === player.id && p.resource === pos.resource));
    }
  });
  player.positions = [];

  return state;
}

/** Rotates to the next non-sabotaged player, applies their passive abilities and auto-collection, checks for a win. */
export function handleEndTurn(state: GameState): GameState {
  if (state.players.length === 0) return state;

  if (state.currentPlayerIndex >= state.players.length) {
    state.currentPlayerIndex = 0;
  }

  let attempts = 0;
  let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.currentPlayerIndex = nextPlayerIndex;
  let nextPlayer = state.players[nextPlayerIndex];

  while (nextPlayer.isSabotaged && attempts < state.players.length) {
    nextPlayer.isSabotaged = false;
    state.log.push(`${nextPlayer.name}'s turn was skipped due to Sabotage!`);
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

  if (nextPlayer.passiveAbilities.explorer) {
    const occupiedIslands = new Set<string>();
    nextPlayer.armies.forEach((army: Army) => {
      const tile = state.map[army.position.y * state.settings.gridSize.cols + army.position.x];
      if (tile && tile.type !== IslandType.Base) {
        occupiedIslands.add(tile.id);
      }
    });
    const vpGained = occupiedIslands.size;
    if (vpGained > 0) {
      nextPlayer.victoryPoints += vpGained;
      state.log.push(`${nextPlayer.name}'s Explorer ability generated ${vpGained} VP.`);
    }
  }

  if (nextPlayer.passiveAbilities.collector) {
    const resourcesCollected: Partial<Record<string, number>> = {};
    const occupiedIslands = new Set<string>();

    nextPlayer.armies.forEach((army: Army) => {
      const tile = state.map[army.position.y * state.settings.gridSize.cols + army.position.x];
      if (!tile || occupiedIslands.has(tile.id)) return;

      if (tile.type === IslandType.Resource && Array.isArray(tile.resources) && tile.resources.length > 0) {
        occupiedIslands.add(tile.id);
        tile.resources.forEach((resource) => {
          nextPlayer.resources[resource.type] += 1;
          resourcesCollected[resource.type] = (resourcesCollected[resource.type] || 0) + 1;
        });
      }
    });

    const collectedStrings = Object.entries(resourcesCollected).map(([type, amount]) => `${amount} ${type}`);
    if (collectedStrings.length > 0) {
      state.log.push(`${nextPlayer.name}'s Collector ability gathered ${collectedStrings.join(', ')}.`);
    }
  }

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
    state.log.push(`🎉 ${nextPlayer.name} has reached ${nextPlayer.victoryPoints} Victory Points and won the game!`);
  }

  state.log.push(`It's now ${nextPlayer.name}'s turn.`);

  state.combatState = null;
  state.monsterCombatState = null;
  if (state.deathAnimations && state.deathAnimations.length > 0) {
    const now = Date.now();
    state.deathAnimations = state.deathAnimations.filter(
      (anim) => anim.createdAt && now - anim.createdAt < DEATH_ANIMATION_DURATION_MS,
    );
  }

  return state;
}
