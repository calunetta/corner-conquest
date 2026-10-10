import { releaseUsername } from './services/player-session.service';

/**
 * Frees a guest's reserved username and its local copy. Does not touch React state, so it is
 * safe to call while the auth listener is restoring an account's own username.
 */
export async function releaseGuestReservation(guestUsername: string | null): Promise<void> {
  if (guestUsername) {
    try {
      await releaseUsername(guestUsername);
    } catch (error) {
      console.error('Error removing guest username:', error);
    }
  }
  localStorage.removeItem('username');
}
