import type { GameState } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { db, doc, runTransaction } from '@/lib/firebase';
import { handleEndTurn } from '../player-turn.reducer';
import { pushLogEntry } from '../log-entry';

/**
 * Hands a seat in an in-progress match to a bot instead of removing it, so seat indices and
 * every reference to them stay valid. Does not end the seat's turn: if it was that seat's turn,
 * it stays the current player as a bot, and the session driver's bot-turn effect
 * (`game-board.engine.hook.ts`) plays it out and ends it from there.
 */
function convertSeatToBot(state: GameState, playerIndex: number): void {
  const seat = state.players[playerIndex];
  pushLogEntry(state, {
    category: 'system',
    message: `${seat.name} has left the game. A bot is taking over their seat.`,
    playerId: seat.playerId,
  });
  seat.isBot = true;
  seat.isVacant = true;
  delete state.heartbeats[playerIndex];
}

/**
 * Removes a player from a match, in one Firestore transaction.
 * - In progress: the seat becomes a bot (see `convertSeatToBot`) and is never removed; the match
 *   is deleted only when no real players remain. An already-bot seat is a no-op, so racing
 *   staleness checks and a doubled exit click cannot convert the same seat twice.
 * - Finished: the match is deleted only when no real players remain; otherwise nothing is written,
 *   so the other clients' victory screens are not disturbed.
 * - Pre-game: the match is deleted if no real players remain, or if the host leaves a one-player
 *   lobby. Otherwise the player is removed, players/baseTiles/map references are reindexed, and
 *   the exiting player's turn ends if it was theirs.
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

      const remainingRealPlayers = currentState.players.filter((p) => !p.isBot && p.playerId !== playerId);

      if (currentState.status === GameStatus.Playing) {
        if (currentState.players[playerIndex].isBot) {
          return;
        }
        if (remainingRealPlayers.length === 0) {
          transaction.delete(gameDocRef);
          return;
        }
        convertSeatToBot(currentState, playerIndex);
        transaction.set(gameDocRef, currentState);
        return;
      }

      // The victory screen is already showing on the remaining clients; the match is over, so
      // pre-game removal (splice, renumber, handleEndTurn) must not mutate it.
      if (currentState.status === GameStatus.Finished) {
        if (remainingRealPlayers.length === 0) {
          transaction.delete(gameDocRef);
        }
        return;
      }

      const isHost = playerIndex === 0;
      if (remainingRealPlayers.length === 0 || (isHost && currentState.players.length <= 1)) {
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
