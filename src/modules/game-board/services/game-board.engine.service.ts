import { db, doc, onSnapshot, setDoc, updateDoc } from '@/lib/firebase';
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
