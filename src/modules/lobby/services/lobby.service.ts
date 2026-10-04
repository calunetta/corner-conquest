import { db, collection, doc, query, where, onSnapshot, setDoc, runTransaction } from '@/lib/firebase';
import { addPlayerToGame, defaultGameSettings } from '@/modules/game-rules';
import type { GameState } from '@/lib/types';
import { GameStatus } from '@/lib/types';

/**
 * Subscribes to every match currently waiting for players. Calls `onGames` with the full list on
 * every update, `onError` if the listener itself fails. Returns the Firestore unsubscribe function.
 */
export function subscribeToOpenGames(
  onGames: (games: GameState[]) => void,
  onError: (error: Error) => void,
): () => void {
  const openGamesQuery = query(collection(db, 'games'), where('status', '==', GameStatus.Waiting));

  return onSnapshot(
    openGamesQuery,
    (querySnapshot) => {
      const games: GameState[] = [];
      querySnapshot.forEach((docSnap) => {
        const firestoreState = docSnap.data() as GameState;
        games.push({
          ...firestoreState,
          id: docSnap.id,
          settings: firestoreState.settings || defaultGameSettings,
        });
      });
      onGames(games);
    },
    onError,
  );
}

/** Reserves a new match document id without writing anything. */
export function createGameId(): string {
  return doc(collection(db, 'games')).id;
}

/** Writes the full match document, creating or overwriting it at `game.id`. */
export async function saveGame(game: GameState): Promise<void> {
  await setDoc(doc(db, 'games', game.id), game);
}

/**
 * Adds a player to a waiting match in one transaction. Resolves silently (no write) if the player
 * is already seated. Throws with the exact message to show the player on each failure.
 */
export async function joinOpenGame(
  gameId: string,
  player: { playerId: string; name: string },
): Promise<void> {
  const gameDocRef = doc(db, 'games', gameId);

  await runTransaction(db, async (transaction) => {
    const gameDoc = await transaction.get(gameDocRef);

    if (!gameDoc.exists()) {
      throw new Error('Game not found.');
    }

    const gameState = gameDoc.data() as GameState;

    if (gameState.status !== GameStatus.Waiting) {
      throw new Error('This game has already started or is no longer available.');
    }
    if (gameState.players.length >= gameState.maxPlayers) {
      throw new Error('This game is full.');
    }
    if (gameState.players.some((p) => p.playerId === player.playerId)) {
      return;
    }

    const { newGameState } = addPlayerToGame(gameState, player);

    if (!newGameState) {
      throw new Error('Could not add player to game. The room might be full or color unavailable.');
    }

    transaction.set(gameDocRef, newGameState);
  });
}
