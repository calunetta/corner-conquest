import type { GameState } from '@/lib/types';
import { GameStatus, HAND_LIMIT, IslandType } from '@/lib/types';

/** Reveals a tile for the current player: fog-of-war reveal, discovery VP, special-island card draw. */
export function revealIsland(state: GameState, x: number, y: number, isScout: boolean = false): GameState {
  const player = state.players[state.currentPlayerIndex];
  const tile = state.map[y * state.settings.gridSize.cols + x];
  const tileId = tile.id;

  if (player.revealedTiles.includes(tileId)) {
    return state;
  }

  player.revealedTiles.push(tileId);

  const isFirstEverDiscovery = !state.players.some((p) => p.id !== player.id && p.revealedTiles.includes(tileId));
  if (isFirstEverDiscovery && state.settings.vpPerIslandDiscovery > 0 && !isScout) {
    player.victoryPoints += state.settings.vpPerIslandDiscovery;
    state.log.push(`${player.name} discovered a new island and gains ${state.settings.vpPerIslandDiscovery} VP!`);

    if (player.victoryPoints >= state.settings.victoryPointGoal && !state.winner) {
      state.winner = player;
      state.status = GameStatus.Finished;
      state.log.push(`🎉 ${player.name} has reached ${player.victoryPoints} Victory Points and won the game!`);
    }
  }

  if (tile.type === IslandType.Special && !isScout) {
    if (player.specialCards.length >= HAND_LIMIT && !state.debugMode) {
      state.log.push(`${player.name} discovered a special island, but their hand is full!`);
    } else if (state.specialCardsDeck.length > 0 || state.discardPile.length > 0) {
      if (state.specialCardsDeck.length === 0) {
        state.log.push('The deck is empty. Reshuffling the discard pile...');
        const newDeck = [...state.discardPile];
        for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        state.specialCardsDeck = newDeck;
        state.discardPile = [];
      }
      if (state.specialCardsDeck.length > 0) {
        const cardIndex = Math.floor(Math.random() * state.specialCardsDeck.length);
        const drawnCardResult = state.specialCardsDeck.splice(cardIndex, 1)[0];
        player.specialCards.push(drawnCardResult);
        state.log.push(`${player.name} discovered a special island and found a card: "${drawnCardResult}"!`);
      }
    } else {
      state.log.push(`${player.name} discovered a special island, but the deck is empty!`);
    }
  }

  return state;
}
