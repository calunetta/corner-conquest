import type { AvatarId } from '@/modules/avatars';

export interface PlayerContextType {
  playerId: string | null;
  username: string | null;
  /** True for a guest's anonymous Firebase session; false for a Google account. */
  isGuest: boolean;
  /** True until the first onAuthStateChanged callback fires; Login shows a spinner during this window. */
  isAuthLoading: boolean;
  setUsername: (name: string) => Promise<boolean>;
  /** Opens the Google sign-in popup. Resolves false (not throws) on failure, for the Login hook to show an error dialog. */
  signInWithGoogle: () => Promise<boolean>;
  /**
   * Links the current guest session to a Google account, keeping the same uid. Rejects with the
   * original Firebase error (e.g. code `auth/credential-already-in-use`) on failure, so the
   * caller picks the right message instead of one generic one.
   */
  linkWithGoogle: () => Promise<void>;
  logout: () => void;
  avatarId: AvatarId | null;
  /** Signed-in account: persists to accounts/{uid}.avatarId, reverts local state and resolves
   *  false on a failed write. Guest: updates local state only, always resolves true. */
  setAvatarId: (avatarId: AvatarId) => Promise<boolean>;
}
