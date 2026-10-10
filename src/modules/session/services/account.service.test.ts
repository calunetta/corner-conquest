jest.mock('@/lib/firebase', () => {
  const mockAuth = { name: 'auth' };
  const mockProvider = { name: 'google-provider' };
  return {
    auth: mockAuth,
    db: { name: 'db' },
    doc: jest.fn((database: unknown, collection: string, id: string) => ({ database, collection, id })),
    getDoc: jest.fn(),
    writeBatch: jest.fn(),
    GoogleAuthProvider: jest.fn(() => mockProvider),
    signInWithPopup: jest.fn(),
    signInAnonymously: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  };
});

import {
  auth,
  db,
  doc,
  getDoc,
  writeBatch,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously as signInAnonymouslyWithFirebase,
  signOut,
  onAuthStateChanged,
} from '@/lib/firebase';
import {
  bindUsernameToAccount,
  claimAccountUsername,
  findAccountUsername,
  signInAnonymously,
  signInWithGoogle,
  signOutOfAccount,
  subscribeToAuthState,
} from './account.service';

const mockDoc = doc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockWriteBatch = writeBatch as jest.Mock;
const mockGoogleAuthProvider = GoogleAuthProvider as unknown as jest.Mock;
const mockSignInWithPopup = signInWithPopup as jest.Mock;
const mockSignInAnonymouslyWithFirebase = signInAnonymouslyWithFirebase as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;

const existingSnapshot = (data: Record<string, unknown>) => ({ exists: () => true, data: () => data });
const missingSnapshot = () => ({ exists: () => false, data: () => undefined });

/** Makes getDoc answer per "<collection>/<id>" path, so each test states exactly which docs exist. */
function givenDocs(docs: Record<string, ReturnType<typeof existingSnapshot> | ReturnType<typeof missingSnapshot>>) {
  mockGetDoc.mockImplementation((ref: { collection: string; id: string }) => {
    return Promise.resolve(docs[`${ref.collection}/${ref.id}`] ?? missingSnapshot());
  });
}

describe('account.service', () => {
  let batch: { set: jest.Mock; commit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    batch = { set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batch);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('opens the Google popup with the Firebase auth instance and a GoogleAuthProvider', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { uid: 'uid_1', displayName: 'Alice' } });

      await signInWithGoogle();

      expect(mockGoogleAuthProvider).toHaveBeenCalledTimes(1);
      expect(mockSignInWithPopup).toHaveBeenCalledWith(auth, { name: 'google-provider' });
    });

    it('resolves to exactly { uid, displayName, isAnonymous } from the credential user', async () => {
      mockSignInWithPopup.mockResolvedValue({
        user: { uid: 'uid_1', displayName: 'Alice', email: 'alice@example.com', photoURL: 'x', isAnonymous: false },
      });

      const account = await signInWithGoogle();

      expect(account).toEqual({ uid: 'uid_1', displayName: 'Alice', isAnonymous: false });
    });

    it('keeps a null displayName as null', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { uid: 'uid_2', displayName: null, isAnonymous: false } });

      const account = await signInWithGoogle();

      expect(account).toEqual({ uid: 'uid_2', displayName: null, isAnonymous: false });
    });

    it('rejects with the popup error when the user closes the popup', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('auth/popup-closed-by-user'));

      await expect(signInWithGoogle()).rejects.toThrow('auth/popup-closed-by-user');
    });

    it('does not read or write Firestore', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { uid: 'uid_1', displayName: 'Alice' } });

      await signInWithGoogle();

      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });
  });

  describe('signInAnonymously', () => {
    it('opens an anonymous session with the Firebase auth instance', async () => {
      mockSignInAnonymouslyWithFirebase.mockResolvedValue({ user: { uid: 'uid_guest', displayName: null, isAnonymous: true } });

      await signInAnonymously();

      expect(mockSignInAnonymouslyWithFirebase).toHaveBeenCalledWith(auth);
    });

    it('resolves to exactly { uid, displayName, isAnonymous: true } from the credential user', async () => {
      mockSignInAnonymouslyWithFirebase.mockResolvedValue({ user: { uid: 'uid_guest', displayName: null, isAnonymous: true } });

      const account = await signInAnonymously();

      expect(account).toEqual({ uid: 'uid_guest', displayName: null, isAnonymous: true });
    });

    it('rejects with the Firebase error on failure (network, or Anonymous Auth disabled)', async () => {
      mockSignInAnonymouslyWithFirebase.mockRejectedValue(new Error('auth/operation-not-allowed'));

      await expect(signInAnonymously()).rejects.toThrow('auth/operation-not-allowed');
    });

    it('does not read or write Firestore', async () => {
      mockSignInAnonymouslyWithFirebase.mockResolvedValue({ user: { uid: 'uid_guest', displayName: null, isAnonymous: true } });

      await signInAnonymously();

      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });
  });

  describe('signOutOfAccount', () => {
    it('calls Firebase signOut with the auth instance', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await signOutOfAccount();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledWith(auth);
    });

    it('never touches Firestore, so the username reservation survives sign-out', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await signOutOfAccount();

      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('rejects when Firebase signOut fails', async () => {
      mockSignOut.mockRejectedValue(new Error('network down'));

      await expect(signOutOfAccount()).rejects.toThrow('network down');
    });
  });

  describe('subscribeToAuthState', () => {
    it('registers a listener on the Firebase auth instance', () => {
      mockOnAuthStateChanged.mockReturnValue(() => {});

      subscribeToAuthState(() => {});

      expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(auth, expect.any(Function));
    });

    it('reports the current signed-in user as an AuthAccount', () => {
      mockOnAuthStateChanged.mockImplementation((_auth, listener: (user: unknown) => void) => {
        listener({ uid: 'uid_1', displayName: 'Alice', email: 'alice@example.com', isAnonymous: false });
        return () => {};
      });
      const onChange = jest.fn();

      subscribeToAuthState(onChange);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ uid: 'uid_1', displayName: 'Alice', isAnonymous: false });
    });

    it('reports a guest Firebase session with isAnonymous true', () => {
      mockOnAuthStateChanged.mockImplementation((_auth, listener: (user: unknown) => void) => {
        listener({ uid: 'uid_guest', displayName: null, isAnonymous: true });
        return () => {};
      });
      const onChange = jest.fn();

      subscribeToAuthState(onChange);

      expect(onChange).toHaveBeenCalledWith({ uid: 'uid_guest', displayName: null, isAnonymous: true });
    });

    it('reports null when no account is signed in', () => {
      mockOnAuthStateChanged.mockImplementation((_auth, listener: (user: unknown) => void) => {
        listener(null);
        return () => {};
      });
      const onChange = jest.fn();

      subscribeToAuthState(onChange);

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('reports every later change, including sign-out (null)', () => {
      let fireAuthChange: (user: unknown) => void = () => {};
      mockOnAuthStateChanged.mockImplementation((_auth, listener: (user: unknown) => void) => {
        fireAuthChange = listener;
        return () => {};
      });
      const onChange = jest.fn();

      subscribeToAuthState(onChange);
      fireAuthChange({ uid: 'uid_1', displayName: 'Alice', isAnonymous: false });
      fireAuthChange(null);

      expect(onChange.mock.calls).toEqual([[{ uid: 'uid_1', displayName: 'Alice', isAnonymous: false }], [null]]);
    });

    it('returns the unsubscribe function from onAuthStateChanged', () => {
      const unsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValue(unsubscribe);

      const returned = subscribeToAuthState(() => {});

      expect(returned).toBe(unsubscribe);
    });
  });

  describe('findAccountUsername', () => {
    it('reads accounts/{authUid} and returns its username', async () => {
      givenDocs({ 'accounts/uid_1': existingSnapshot({ username: 'Alice' }) });

      const username = await findAccountUsername('uid_1');

      expect(mockDoc).toHaveBeenCalledWith(db, 'accounts', 'uid_1');
      expect(username).toBe('Alice');
    });

    it('returns null when the account has not claimed a username yet', async () => {
      givenDocs({});

      const username = await findAccountUsername('uid_new');

      expect(mockDoc).toHaveBeenCalledWith(db, 'accounts', 'uid_new');
      expect(username).toBeNull();
    });

    it('does not read the usernames collection', async () => {
      givenDocs({ 'accounts/uid_1': existingSnapshot({ username: 'Alice' }) });

      await findAccountUsername('uid_1');

      expect(mockDoc).not.toHaveBeenCalledWith(db, 'usernames', expect.anything());
    });

    it('rejects when the Firestore read fails', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore unavailable'));

      await expect(findAccountUsername('uid_1')).rejects.toThrow('Firestore unavailable');
    });
  });

  describe('bindUsernameToAccount', () => {
    it('writes usernames/{username} with playerId and authUid set to the uid', async () => {
      await bindUsernameToAccount('Alice', 'uid_1');

      expect(mockDoc).toHaveBeenCalledWith(db, 'usernames', 'Alice');
      expect(batch.set).toHaveBeenCalledWith({ database: db, collection: 'usernames', id: 'Alice' }, { playerId: 'uid_1', authUid: 'uid_1' });
    });

    it('writes accounts/{uid} pointing back at the username', async () => {
      await bindUsernameToAccount('Alice', 'uid_1');

      expect(mockDoc).toHaveBeenCalledWith(db, 'accounts', 'uid_1');
      expect(batch.set).toHaveBeenCalledWith({ database: db, collection: 'accounts', id: 'uid_1' }, { username: 'Alice' });
    });

    it('puts both writes in one batch and commits it exactly once', async () => {
      await bindUsernameToAccount('Alice', 'uid_1');

      expect(mockWriteBatch).toHaveBeenCalledWith(db);
      expect(batch.set).toHaveBeenCalledTimes(2);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it('commits only after both writes are queued', async () => {
      const order: string[] = [];
      batch.set.mockImplementation(() => order.push('set'));
      batch.commit.mockImplementation(async () => {
        order.push('commit');
      });

      await bindUsernameToAccount('Alice', 'uid_1');

      expect(order).toEqual(['set', 'set', 'commit']);
    });

    it('rejects and does not report success when the batch commit fails', async () => {
      batch.commit.mockRejectedValue(new Error('permission-denied'));

      await expect(bindUsernameToAccount('Alice', 'uid_1')).rejects.toThrow('permission-denied');
    });
  });

  describe('claimAccountUsername', () => {
    it('binds the name and returns true when nobody holds it', async () => {
      givenDocs({});

      const isClaimed = await claimAccountUsername('Alice', 'uid_1');

      expect(isClaimed).toBe(true);
      expect(batch.commit).toHaveBeenCalledTimes(1);
      expect(batch.set).toHaveBeenCalledWith({ database: db, collection: 'usernames', id: 'Alice' }, { playerId: 'uid_1', authUid: 'uid_1' });
    });

    it('returns false and writes nothing when another account already holds the name', async () => {
      givenDocs({ 'usernames/Alice': existingSnapshot({ playerId: 'uid_other', authUid: 'uid_other' }) });

      const isClaimed = await claimAccountUsername('Alice', 'uid_1');

      expect(isClaimed).toBe(false);
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('returns false and writes nothing when a guest session holds the name', async () => {
      givenDocs({ 'usernames/Alice': existingSnapshot({ playerId: 'player_123_abc', authUid: null }) });

      const isClaimed = await claimAccountUsername('Alice', 'uid_1');

      expect(isClaimed).toBe(false);
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('binds again and returns true when the same uid already holds the name', async () => {
      givenDocs({ 'usernames/Alice': existingSnapshot({ playerId: 'uid_1', authUid: 'uid_1' }) });

      const isClaimed = await claimAccountUsername('Alice', 'uid_1');

      expect(isClaimed).toBe(true);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it('returns false and logs when the availability read fails, without writing', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore unavailable'));

      const isClaimed = await claimAccountUsername('Alice', 'uid_1');

      expect(isClaimed).toBe(false);
      expect(mockWriteBatch).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error claiming account username:', expect.any(Error));
    });

    it('returns false and logs when the batch commit is rejected (e.g. the rules refuse a second binding)', async () => {
      givenDocs({});
      batch.commit.mockRejectedValue(new Error('permission-denied'));

      const isClaimed = await claimAccountUsername('Alice', 'uid_1');

      expect(isClaimed).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error claiming account username:', expect.any(Error));
    });
  });
});
