import {
  auth,
  db,
  doc,
  getDoc,
  writeBatch,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from '@/lib/firebase';
import { findUsernameOwner } from './player-session.service';

export interface AuthAccount {
  uid: string;
  displayName: string | null;
}

function toAuthAccount(user: { uid: string; displayName: string | null }): AuthAccount {
  return { uid: user.uid, displayName: user.displayName };
}

/** Opens the Google OAuth popup. Throws on failure or if the user closes the popup. */
export async function signInWithGoogle(): Promise<AuthAccount> {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
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
