import { db, doc, onSnapshot, setDoc, updateDoc } from '@/lib/firebase';
import type { CardRevealAnimation, DeathAnimation, GameState } from '@/lib/types';

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

export async function clearCardRevealAnimations(gameId: string, remaining: CardRevealAnimation[]): Promise<void> {
  const gameDocRef = doc(db, 'games', gameId);
  await updateDoc(gameDocRef, { cardRevealAnimations: remaining });
}

/** Stamps this seat's heartbeat with a single-field-path write, so it is never version-checked
 *  against the rest of the document and cannot collide with a concurrent `saveGameState`/bot-turn
 *  `setDoc`. */
export async function writeHeartbeat(gameId: string, playerIndex: number): Promise<void> {
  const gameDocRef = doc(db, 'games', gameId);
  await updateDoc(gameDocRef, { [`heartbeats.${playerIndex}`]: Date.now() });
}
