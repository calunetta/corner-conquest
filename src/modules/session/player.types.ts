export interface PlayerContextType {
  playerId: string | null;
  username: string | null;
  /** True once Firebase Auth has reported no signed-in account (never true at the same time as a signed-in account). */
  isGuest: boolean;
  /** True until the first onAuthStateChanged callback fires; Login shows a spinner during this window. */
  isAuthLoading: boolean;
  setUsername: (name: string) => Promise<boolean>;
  /** Opens the Google sign-in popup. Resolves false (not throws) on failure, for the Login hook to show an error dialog. */
  signInWithGoogle: () => Promise<boolean>;
  logout: () => void;
}
