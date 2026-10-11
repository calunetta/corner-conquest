import type { GameState } from '@/lib/types';
import { db, doc, runTransaction } from '@/lib/firebase';

/**
 * Hands a vacant seat back to the human who used to hold it, in one Firestore transaction.
 * Resolves `false` without writing if `playerId` doesn't own a currently vacant seat (already
 * reclaimed, or never vacated) — callers must check this before treating the reclaim as a
 * success. If it's currently that seat's (bot) turn, defers the flip to `handleEndTurn` instead
 * of interrupting the in-flight turn. I/O errors propagate; callers must catch them.
 */
export async function handleSeatReclaim(gameId: string, playerId: string): Promise<boolean> {
  const gameDocRef = doc(db, 'games', gameId);

  return runTransaction(db, async (transaction) => {
    const gameDoc = await transaction.get(gameDocRef);
    if (!gameDoc.exists()) {
      return false;
    }

    const currentState = gameDoc.data() as GameState;
    const playerIndex = currentState.players.findIndex((p) => p.playerId === playerId && p.isVacant);
    if (playerIndex === -1) {
      return false;
    }

    const seat = currentState.players[playerIndex];
    if (currentState.currentPlayerIndex === playerIndex) {
      seat.reclaimRequested = true;
    } else {
      seat.isBot = false;
      seat.isVacant = false;
    }

    transaction.set(gameDocRef, currentState);
    return true;
  });
}
