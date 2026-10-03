import type { GameState } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { db, doc, runTransaction } from '@/lib/firebase';
import { handleEndTurn } from '../player-turn.reducer';

/**
 * Removes a player from an in-progress match, in one Firestore transaction. Deletes the match
 * document outright if the host leaves mid-game, if no real players remain, or if the host
 * leaves a match with no other players. Otherwise reindexes players/baseTiles/map references and
 * ends the exiting player's turn if it was theirs, then writes the updated document back.
 */
export async function handlePlayerExit(gameId: string, playerId: string): Promise<void> {
  try {
    const gameDocRef = doc(db, 'games', gameId);

    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameDocRef);
      if (!gameDoc.exists()) {
        return;
      }
      let currentState = gameDoc.data() as GameState;
      const playerIndex = currentState.players.findIndex((p) => p.playerId === playerId);
      if (playerIndex === -1) {
        return;
      }

      const isHost = playerIndex === 0;
      const remainingRealPlayers = currentState.players.filter((p) => !p.isBot && p.playerId !== playerId);

      if (
        (isHost && currentState.status === GameStatus.Playing) ||
        remainingRealPlayers.length === 0 ||
        (isHost && currentState.players.length <= 1)
      ) {
        transaction.delete(gameDocRef);
        return;
      }

      const isCurrentPlayerExiting = currentState.currentPlayerIndex === playerIndex;

      currentState.log.push(`${currentState.players[playerIndex].name} has left the game.`);

      currentState.map.forEach((tile) => {
        tile.occupants = tile.occupants.filter((o) => o.playerId !== playerIndex);
        tile.positionedBy = (tile.positionedBy || []).filter((p) => p.playerId !== playerIndex);
      });

      currentState.players.splice(playerIndex, 1);

      // Re-assign player IDs to be contiguous (0, 1, 2...)
      currentState.players.forEach((p, i) => (p.id = i));

      // Update baseTiles ownership
      currentState.baseTiles = currentState.baseTiles
        .filter((b) => b.owner !== playerIndex)
        .map((b) => ({
          ...b,
          owner: b.owner > playerIndex ? b.owner - 1 : b.owner,
        }));

      // Update references in map occupants and positionedBy
      currentState.map.forEach((tile) => {
        tile.occupants.forEach((o) => {
          if (o.playerId > playerIndex) o.playerId--;
        });
        (tile.positionedBy || []).forEach((p) => {
          if (p.playerId > playerIndex) p.playerId--;
        });
      });

      // Update references in combat state
      if (currentState.combatState) {
        if (
          currentState.combatState.attackerId === playerIndex ||
          currentState.combatState.defenderId === playerIndex
        ) {
          currentState.combatState = null;
        } else {
          if (currentState.combatState.attackerId > playerIndex) currentState.combatState.attackerId--;
          if (currentState.combatState.defenderId > playerIndex) currentState.combatState.defenderId--;
        }
      }

      // Adjust currentPlayerIndex
      if (isCurrentPlayerExiting) {
        currentState.currentPlayerIndex = playerIndex % currentState.players.length;
        currentState = handleEndTurn(currentState);
      } else if (currentState.currentPlayerIndex > playerIndex) {
        currentState.currentPlayerIndex--;
      }

      if (currentState.currentPlayerIndex >= currentState.players.length) {
        currentState.currentPlayerIndex = 0;
      }

      transaction.set(gameDocRef, currentState);
    });
  } catch (error) {
    console.error('Error leaving game:', error);
  }
}
