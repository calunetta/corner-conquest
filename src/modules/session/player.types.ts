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
}
