import type { GameState } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { db, doc, runTransaction } from '@/lib/firebase';
import { handleEndTurn } from '../player-turn.reducer';
import { pushLogEntry } from '../log-entry';

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

      pushLogEntry(currentState, {
        category: 'system',
        message: `${currentState.players[playerIndex].name} has left the game.`,
        playerId: currentState.players[playerIndex].playerId,
      });

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

      // Update references in monster combat state
      if (currentState.monsterCombatState) {
        if (currentState.monsterCombatState.attackerId === playerIndex) {
          currentState.monsterCombatState = null;
        } else if (currentState.monsterCombatState.attackerId > playerIndex) {
          currentState.monsterCombatState.attackerId--;
        }
      }

      // Adjust currentPlayerIndex
      if (isCurrentPlayerExiting) {
        // After the splice, the seat that was next now sits at `playerIndex`. handleEndTurn advances by one,
        // so start from the seat before it (wrapping) to land on the player who was next in order.
        currentState.currentPlayerIndex =
          (playerIndex - 1 + currentState.players.length) % currentState.players.length;
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
