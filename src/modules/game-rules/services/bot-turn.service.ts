import type { GameState } from '@/lib/types';
import { db, doc, setDoc } from '@/lib/firebase';
import { decideBotTurn } from '../bot-turn.reducer';

/**
 * Validates it is a bot's turn in progress, runs the pure decision tree, then writes the
 * resulting state back to Firestore in one atomic write.
 */
export async function takeBotTurn(initialState: GameState): Promise<void> {
  const botPlayer = initialState.players[initialState.currentPlayerIndex];
  if (!botPlayer || !botPlayer.isBot || initialState.status !== 'playing') return;

  const finalState = decideBotTurn(initialState);

  await setDoc(doc(db, 'games', initialState.id), finalState);
}
