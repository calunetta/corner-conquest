import { db, doc, onSnapshot, runTransaction, setDoc, updateDoc } from '@/lib/firebase';
import type { DeathAnimation, GameState } from '@/lib/types';

export interface GameStateSubscriptionCallbacks {
  onData: (state: GameState) => void;
  onMissing: () => void;
  onError: (error: unknown) => void;
}

/** Wraps onSnapshot(doc(db,'games',gameId), ...); returns the unsubscribe function. */
export function subscribeToGameState(gameId: string, callbacks: GameStateSubscriptionCallbacks): () => void {
  const gameDocRef = doc(db, 'games', gameId);

  return onSnapshot(
    gameDocRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        callbacks.onData(docSnapshot.data() as GameState);
      } else {
        callbacks.onMissing();
      }
    },
    (error) => {
      callbacks.onError(error);
    },
  );
}

export async function saveGameState(gameId: string, state: GameState): Promise<void> {
  const gameDocRef = doc(db, 'games', gameId);
  await setDoc(gameDocRef, state);
}

export async function clearDeathAnimations(gameId: string, remaining: DeathAnimation[]): Promise<void> {
  const gameDocRef = doc(db, 'games', gameId);
  await updateDoc(gameDocRef, { deathAnimations: remaining });
}

/**
 * Stamps `lastSeenAt` on one seat. Runs as a transaction because `players` is an array: a dotted
 * `updateDoc` path cannot address an element by index, and a plain write from a stale snapshot
 * would drop another player's concurrent heartbeat.
 */
export async function writeHeartbeat(gameId: string, playerIndex: number): Promise<void> {
  const gameDocRef = doc(db, 'games', gameId);

  await runTransaction(db, async (transaction) => {
    const gameDoc = await transaction.get(gameDocRef);
    if (!gameDoc.exists()) return;

    const state = gameDoc.data() as GameState;
    const seat = state.players[playerIndex];
    if (!seat) return;

    seat.lastSeenAt = Date.now();
    transaction.set(gameDocRef, state);
  });
}
