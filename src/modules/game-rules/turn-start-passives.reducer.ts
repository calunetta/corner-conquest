import type { Army, GameState, Player } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { pushLogEntry } from './log-entry';

/**
 * Applies a reclaim that was deferred because it arrived mid-turn: if the outgoing player's seat
 * is vacant and has a pending reclaim request, hands it back to the human now that their turn is over.
 */
export function applyDeferredReclaim(state: GameState): void {
  const outgoing = state.players[state.currentPlayerIndex];
  if (!outgoing.isVacant || !outgoing.reclaimRequested) return;

  outgoing.isBot = false;
  outgoing.isVacant = false;
  outgoing.reclaimRequested = false;
  pushLogEntry(state, {
    category: 'system',
    message: `${outgoing.name} has reclaimed their seat.`,
    playerId: outgoing.playerId,
    isPassive: true,
  });
}

/** Explorer passive: 1 VP per distinct non-Base island one of the player's armies occupies. */
export function applyExplorerAbility(state: GameState, player: Player): void {
  if (!player.passiveAbilities.explorer) return;

  const occupiedIslands = new Set<string>();
  player.armies.forEach((army: Army) => {
    const tile = state.map[army.position.y * state.settings.gridSize.cols + army.position.x];
    if (tile && tile.type !== IslandType.Base) {
      occupiedIslands.add(tile.id);
    }
  });

  const vpGained = occupiedIslands.size;
  if (vpGained > 0) {
    player.victoryPoints += vpGained;
    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name}'s Explorer ability generated ${vpGained} VP.`,
      playerId: player.playerId,
      isPassive: true,
    });
  }
}

/** Collector passive: 1 of each resource type per distinct Resource island one of the player's armies occupies. */
export function applyCollectorAbility(state: GameState, player: Player): void {
  if (!player.passiveAbilities.collector) return;

  const resourcesCollected: Partial<Record<string, number>> = {};
  const occupiedIslands = new Set<string>();

  player.armies.forEach((army: Army) => {
    const tile = state.map[army.position.y * state.settings.gridSize.cols + army.position.x];
    if (!tile || occupiedIslands.has(tile.id)) return;

    if (tile.type === IslandType.Resource && Array.isArray(tile.resources) && tile.resources.length > 0) {
      occupiedIslands.add(tile.id);
      tile.resources.forEach((resource) => {
        player.resources[resource.type] += 1;
        resourcesCollected[resource.type] = (resourcesCollected[resource.type] || 0) + 1;
      });
    }
  });

  const collectedStrings = Object.entries(resourcesCollected).map(([type, amount]) => `${amount} ${type}`);
  if (collectedStrings.length > 0) {
    pushLogEntry(state, {
      category: 'economy',
      message: `${player.name}'s Collector ability gathered ${collectedStrings.join(', ')}.`,
      playerId: player.playerId,
      isPassive: true,
    });
  }
}
