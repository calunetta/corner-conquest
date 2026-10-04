import { db, doc, getDoc, setDoc, deleteDoc } from '@/lib/firebase';

/** Returns the playerId stored for `username`, or null if no reservation exists. */
export async function findUsernameOwner(username: string): Promise<string | null> {
  const usernameDocRef = doc(db, 'usernames', username);
  const docSnap = await getDoc(usernameDocRef);
  if (!docSnap.exists()) {
    return null;
  }
  return docSnap.data().playerId as string;
}

export async function reserveUsername(username: string, playerId: string): Promise<void> {
  const usernameDocRef = doc(db, 'usernames', username);
  await setDoc(usernameDocRef, { playerId });
}

export async function releaseUsername(username: string): Promise<void> {
  const usernameDocRef = doc(db, 'usernames', username);
  await deleteDoc(usernameDocRef);
}
