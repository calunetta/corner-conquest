import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously as signInAnonymouslyWithFirebase,
  signOut,
  onAuthStateChanged,
  linkWithPopup,
  deleteUser,
  reauthenticateWithPopup,
} from '@/lib/firebase';
import { findUsernameOwner } from './player-session.service';

export interface AuthAccount {
  uid: string;
  displayName: string | null;
  /** True for a guest's Firebase Anonymous Auth user; false for a Google-signed-in account. */
  isAnonymous: boolean;
}

function toAuthAccount(user: { uid: string; displayName: string | null; isAnonymous: boolean }): AuthAccount {
  return { uid: user.uid, displayName: user.displayName, isAnonymous: user.isAnonymous };
}

/** Opens the Google OAuth popup. Throws on failure or if the user closes the popup. */
export async function signInWithGoogle(): Promise<AuthAccount> {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return toAuthAccount(credential.user);
}

/**
 * Links the current anonymous guest's Firebase user to a Google account, keeping the same uid
 * (every doc already keyed by that uid stays valid, no migration). Throws the Firebase error
 * untouched on failure — e.g. code `auth/credential-already-in-use` when that Google account is
 * already linked to a different Firebase user, or `auth/popup-closed-by-user` /
 * `auth/cancelled-popup-request` when the user cancels — so callers can tell reasons apart.
 * Throws a plain `Error` if there is no signed-in session to link.
 */
export async function linkGoogleAccount(): Promise<AuthAccount> {
  if (!auth.currentUser) {
    throw new Error('No active session to link.');
  }
  const credential = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
  return toAuthAccount(credential.user);
}

/**
 * Signs this client in anonymously, giving it a Firebase Auth uid Firestore rules can trust.
 * Throws on failure (network, or Anonymous Auth disabled on the project).
 */
export async function signInAnonymously(): Promise<AuthAccount> {
  const credential = await signInAnonymouslyWithFirebase(auth);
  return toAuthAccount(credential.user);
}

export async function signOutOfAccount(): Promise<void> {
  await signOut(auth);
}

/** Fires once immediately with the current session (or null), then on every change. Returns the unsubscribe fn. */
export function subscribeToAuthState(onChange: (account: AuthAccount | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    onChange(user ? toAuthAccount(user) : null);
  });
}

/** Reads accounts/{authUid}.username, or null if this account hasn't claimed one yet. */
export async function findAccountUsername(authUid: string): Promise<string | null> {
  const accountSnap = await getDoc(doc(db, 'accounts', authUid));
  if (!accountSnap.exists()) {
    return null;
  }
  return accountSnap.data().username as string;
}

/** Reads accounts/{authUid}.avatarId. Returns null if the field or the doc is absent. */
export async function findAccountAvatarId(authUid: string): Promise<string | null> {
  const accountSnap = await getDoc(doc(db, 'accounts', authUid));
  if (!accountSnap.exists()) {
    return null;
  }
  return (accountSnap.data().avatarId as string | undefined) ?? null;
}

/**
 * Merges { avatarId } into accounts/{authUid} without touching `username`. The doc must already
 * exist (created by claimAccountUsername/bindUsernameToAccount): firestore.rules only allows an
 * update that changes `avatarId` alone.
 */
export async function setAccountAvatarId(authUid: string, avatarId: string): Promise<void> {
  await setDoc(doc(db, 'accounts', authUid), { avatarId }, { merge: true });
}

/**
 * Atomically creates usernames/{username} (authUid set) and accounts/{authUid} (pointing back
 * at username). Both writes are in one batch so neither can succeed without the other.
 */
export async function bindUsernameToAccount(username: string, authUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'usernames', username), { playerId: authUid, authUid });
  batch.set(doc(db, 'accounts', authUid), { username });
  await batch.commit();
}

function isRecentLoginRequired(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'auth/requires-recent-login';
}

/**
 * Deletes the signed-in player's account: usernames/{username} (if `username` is given) and
 * accounts/{uid} (a no-op delete if it doesn't exist, e.g. a guest) in one batch, then the
 * Firebase Auth user itself. Firestore is deleted first because the rules key on
 * request.auth.uid, which is gone once the Auth user is deleted. Throws
 * `new Error('No active session to delete.')` if nobody is signed in.
 *
 * If the final deleteUser call fails with `auth/requires-recent-login`:
 * - Google-linked account: reauthenticates once via a Google popup, then retries deleteUser.
 *   Any further failure (including a cancelled popup) is rethrown untouched.
 * - Guest (anonymous) account: rethrown immediately — there is no credential to reauthenticate
 *   an anonymous session with. Firestore docs are already gone at that point; only the Auth
 *   user remains, which the caller's UI must tell the player about.
 */
export async function deleteAccount(username: string | null): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No active session to delete.');
  }
  const batch = writeBatch(db);
  if (username !== null) {
    batch.delete(doc(db, 'usernames', username));
  }
  batch.delete(doc(db, 'accounts', user.uid));
  await batch.commit();

  try {
    await deleteUser(user);
  } catch (error) {
    if (!isRecentLoginRequired(error) || user.isAnonymous) {
      throw error;
    }
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    await deleteUser(user);
  }
}

/**
 * Claims `name` for a signed-in account. Returns false if another identity already holds it
 * (a guest or another account), and never throws, so the identity hook can just report failure.
 */
export async function claimAccountUsername(name: string, authUid: string): Promise<boolean> {
  try {
    const ownerId = await findUsernameOwner(name);
    if (ownerId !== null && ownerId !== authUid) {
      return false;
    }
    await bindUsernameToAccount(name, authUid);
    return true;
  } catch (error) {
    console.error('Error claiming account username:', error);
    return false;
  }
}
