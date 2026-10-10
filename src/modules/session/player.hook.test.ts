import { renderHook, act } from '@testing-library/react';
import { usePlayerProvider } from './player.hook';

jest.mock('./services/player-session.service', () => ({
  findUsernameOwner: jest.fn(),
  reserveUsername: jest.fn(),
  releaseUsername: jest.fn(),
}));

jest.mock('./services/account.service', () => ({
  claimAccountUsername: jest.fn(),
  findAccountUsername: jest.fn(),
  signInAnonymously: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOutOfAccount: jest.fn(),
  subscribeToAuthState: jest.fn(),
}));

import * as playerSession from './services/player-session.service';
import * as account from './services/account.service';
import type { AuthAccount } from './services/account.service';

const mockFindUsernameOwner = playerSession.findUsernameOwner as jest.Mock;
const mockReserveUsername = playerSession.reserveUsername as jest.Mock;
const mockReleaseUsername = playerSession.releaseUsername as jest.Mock;
const mockClaimAccountUsername = account.claimAccountUsername as jest.Mock;
const mockFindAccountUsername = account.findAccountUsername as jest.Mock;
const mockSignInAnonymously = account.signInAnonymously as jest.Mock;
const mockSignInWithGoogle = account.signInWithGoogle as jest.Mock;
const mockSignOutOfAccount = account.signOutOfAccount as jest.Mock;
const mockSubscribeToAuthState = account.subscribeToAuthState as jest.Mock;

const ALICE: AuthAccount = { uid: 'uid_alice', displayName: 'Alice Google', isAnonymous: false };
const BOB: AuthAccount = { uid: 'uid_bob', displayName: 'Bob Google', isAnonymous: false };
const GUEST: AuthAccount = { uid: 'uid_guest_1', displayName: null, isAnonymous: true };
const GUEST_2: AuthAccount = { uid: 'uid_guest_2', displayName: null, isAnonymous: true };

/** The auth listener the hook registered, so a test can simulate Firebase Auth changes. */
let emitAuthChange: (account: AuthAccount | null) => void;
const mockUnsubscribe = jest.fn();

/** Lets the async auth callback (and its Firestore reads) settle inside act(). */
async function flushAuthCallback(change: () => void) {
  await act(async () => {
    change();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Registers the listener without firing it, so a test can emit its own first callback. */
function deferInitialAuthReport() {
  mockSubscribeToAuthState.mockImplementation((listener: (value: AuthAccount | null) => void) => {
    emitAuthChange = listener;
    return mockUnsubscribe;
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

describe('usePlayerProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default: fresh visit. Firebase reports no session; the listener signs the guest in
    // anonymously, which resolves to GUEST and re-enters the same listener.
    mockSignInAnonymously.mockImplementation(async () => {
      emitAuthChange(GUEST);
      return GUEST;
    });
    mockSubscribeToAuthState.mockImplementation((listener: (value: AuthAccount | null) => void) => {
      emitAuthChange = listener;
      listener(null);
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('identity: fresh visit', () => {
    it('signs in anonymously when the listener first reports no session', async () => {
      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      expect(result.current.playerId).toBe('uid_guest_1');
      expect(result.current.isGuest).toBe(true);
      expect(result.current.isAuthLoading).toBe(false);
    });

    it('logs and leaves playerId null when the anonymous sign-in fails', async () => {
      mockSignInAnonymously.mockRejectedValue(new Error('auth/operation-not-allowed'));

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(console.error).toHaveBeenCalledWith('Error signing in anonymously:', expect.any(Error));
      expect(result.current.playerId).toBeNull();
      expect(result.current.isAuthLoading).toBe(false);
    });
  });

  describe('identity: returning guest', () => {
    beforeEach(() => {
      // Firebase itself restores a prior anonymous session; the listener's first callback is
      // already the guest account, so no signInAnonymously call is needed.
      mockSubscribeToAuthState.mockImplementation((listener: (value: AuthAccount | null) => void) => {
        emitAuthChange = listener;
        listener(GUEST);
        return mockUnsubscribe;
      });
    });

    it('populates playerId and isGuest directly, without calling signInAnonymously', async () => {
      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(mockSignInAnonymously).not.toHaveBeenCalled();
      expect(result.current.playerId).toBe('uid_guest_1');
      expect(result.current.isGuest).toBe(true);
      expect(result.current.isAuthLoading).toBe(false);
    });
  });

  describe('validateSession (guest)', () => {
    it('sets username when the stored username ownership matches the account uid', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.username).toBe('testuser');
    });

    it('clears username when the stored username ownership does not match the account uid', async () => {
      localStorage.setItem('username', 'othersuser');

      mockFindUsernameOwner.mockResolvedValue('other_uid');

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('clears username when the username does not exist in the database', async () => {
      localStorage.setItem('username', 'deleted_user');

      mockFindUsernameOwner.mockResolvedValue(null);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('clears username on service error', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('leaves username null with no local reservation to restore', async () => {
      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(mockFindUsernameOwner).not.toHaveBeenCalled();
      expect(result.current.username).toBeNull();
    });
  });

  describe('setUsername (guest)', () => {
    it('returns true and reserves the username when it is available', async () => {
      mockFindUsernameOwner.mockResolvedValue(null);
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('newuser');
      });

      expect(setUsernameResult).toBe(true);
      expect(result.current.username).toBe('newuser');
      expect(mockReserveUsername).toHaveBeenCalledWith('newuser', 'uid_guest_1');
    });

    it('returns false when the username is taken by another uid', async () => {
      mockFindUsernameOwner.mockResolvedValue('other_uid');

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('taken_user');
      });

      expect(setUsernameResult).toBe(false);
      expect(result.current.username).toBeNull();
      expect(mockReserveUsername).not.toHaveBeenCalled();
    });

    it('returns true when re-reserving the same username', async () => {
      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('sameuser');
      });

      expect(setUsernameResult).toBe(true);
      expect(result.current.username).toBe('sameuser');
    });

    it('releases the old username when changing to a new one', async () => {
      localStorage.setItem('username', 'olduser');

      mockFindUsernameOwner
        .mockResolvedValueOnce('uid_guest_1') // for olduser validation
        .mockResolvedValueOnce(null); // for newuser availability check
      mockReserveUsername.mockResolvedValue(undefined);
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.username).toBe('olduser');

      await act(async () => {
        await result.current.setUsername('newuser');
      });

      expect(mockReleaseUsername).toHaveBeenCalledWith('olduser');
      expect(result.current.username).toBe('newuser');
    });

    it('does not release the old username when setting the same username', async () => {
      localStorage.setItem('username', 'sameuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      await act(async () => {
        await result.current.setUsername('sameuser');
      });

      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });

    it('persists the username to localStorage on success', async () => {
      mockFindUsernameOwner.mockResolvedValue(null);
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      await act(async () => {
        await result.current.setUsername('persisteduser');
      });

      expect(localStorage.getItem('username')).toBe('persisteduser');
    });

    it('returns false on service error', async () => {
      mockFindUsernameOwner.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('newuser');
      });

      expect(setUsernameResult).toBe(false);
    });
  });

  describe('setUsername before an account exists', () => {
    it('logs and returns false when called before the auth listener has set an account', async () => {
      deferInitialAuthReport();
      const { result } = renderHook(() => usePlayerProvider());
      // No settle(): emitAuthChange was registered but never invoked, so account stays null.

      let setUsernameResult = true;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('newuser');
      });

      expect(setUsernameResult).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Player ID not initialized yet.');
    });
  });

  describe('logout (guest)', () => {
    it('releases the username when logged in', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.username).toBe('testuser');

      await act(async () => {
        await result.current.logout();
      });

      expect(mockReleaseUsername).toHaveBeenCalledWith('testuser');
      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('does nothing if no username is set', async () => {
      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      await act(async () => {
        await result.current.logout();
      });

      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });

    it('clears username from state and localStorage', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('handles errors from releaseUsername gracefully', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReleaseUsername.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      await act(async () => {
        await expect(result.current.logout()).resolves.not.toThrow();
      });

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('does not call Firebase signOut for a guest', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSignOutOfAccount).not.toHaveBeenCalled();
    });
  });

  describe('beforeunload listener (guest)', () => {
    it('attaches and removes the beforeunload listener', async () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => usePlayerProvider());
      await settle();

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('releases the guest username when beforeunload fires', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.username).toBe('testuser');

      jest.clearAllMocks();

      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });
      await settle();

      expect(mockReleaseUsername).toHaveBeenCalledWith('testuser');
    });
  });

  describe('auth state (account)', () => {
    beforeEach(() => {
      deferInitialAuthReport();
    });

    it('reports isAuthLoading true and isGuest false until Firebase Auth has answered', async () => {
      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      expect(result.current.isAuthLoading).toBe(true);
      expect(result.current.isGuest).toBe(false);

      await flushAuthCallback(() => emitAuthChange(GUEST));

      expect(result.current.isAuthLoading).toBe(false);
      expect(result.current.isGuest).toBe(true);
    });

    it('uses the Firebase uid as playerId while an account is signed in', async () => {
      mockFindAccountUsername.mockResolvedValue('Alice');

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      expect(result.current.playerId).toBe('uid_alice');
      expect(result.current.isGuest).toBe(false);
    });

    it('leaves username null on a first sign-in, so the naming step is shown', async () => {
      mockFindAccountUsername.mockResolvedValue(null);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      expect(mockFindAccountUsername).toHaveBeenCalledWith('uid_alice');
      expect(result.current.username).toBeNull();
      expect(result.current.isAuthLoading).toBe(false);
    });

    it('restores the bound username on a returning sign-in without touching usernames', async () => {
      mockFindAccountUsername.mockResolvedValue('Alice');

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      expect(result.current.username).toBe('Alice');
      expect(mockFindUsernameOwner).not.toHaveBeenCalled();
      expect(mockReserveUsername).not.toHaveBeenCalled();
      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });

    it('ignores a guest username in localStorage while an account is signed in', async () => {
      localStorage.setItem('username', 'guestname');
      mockFindAccountUsername.mockResolvedValue(null);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      expect(result.current.username).toBeNull();
      expect(mockFindUsernameOwner).not.toHaveBeenCalled();
    });

    it('clears the previous account username when a different account signs in', async () => {
      mockFindAccountUsername.mockResolvedValueOnce('Alice');
      mockFindAccountUsername.mockResolvedValueOnce(null);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));
      expect(result.current.username).toBe('Alice');

      await flushAuthCallback(() => emitAuthChange(BOB));

      expect(result.current.playerId).toBe('uid_bob');
      expect(result.current.username).toBeNull();
    });

    it('stays usable with username null when reading the account username fails', async () => {
      mockFindAccountUsername.mockRejectedValue(new Error('Firestore unavailable'));

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      expect(result.current.username).toBeNull();
      expect(result.current.isAuthLoading).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error loading account username:', expect.any(Error));
    });

    it('unsubscribes from Firebase Auth on unmount', async () => {
      const { unmount } = renderHook(() => usePlayerProvider());
      await settle();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('signs a new guest in when the listener reports null again after a Google sign-out', async () => {
      mockFindAccountUsername.mockResolvedValue('Alice');
      mockSignInAnonymously.mockResolvedValueOnce(GUEST_2);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));
      expect(result.current.isGuest).toBe(false);

      // Google sign-out: the listener's own null branch re-triggers anonymous sign-in.
      await flushAuthCallback(() => emitAuthChange(null));
      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);

      await flushAuthCallback(() => emitAuthChange(GUEST_2));

      expect(result.current.playerId).toBe('uid_guest_2');
      expect(result.current.isGuest).toBe(true);
    });
  });

  describe('setUsername (account)', () => {
    beforeEach(() => {
      deferInitialAuthReport();
    });

    it('claims the name for the account uid and reports true', async () => {
      mockFindAccountUsername.mockResolvedValue(null);
      mockClaimAccountUsername.mockResolvedValue(true);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('Alice');
      });

      expect(mockClaimAccountUsername).toHaveBeenCalledWith('Alice', 'uid_alice');
      expect(setUsernameResult).toBe(true);
      expect(result.current.username).toBe('Alice');
    });

    it('never writes the account username to localStorage', async () => {
      mockFindAccountUsername.mockResolvedValue(null);
      mockClaimAccountUsername.mockResolvedValue(true);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      await act(async () => {
        await result.current.setUsername('Alice');
      });

      expect(localStorage.getItem('username')).toBeNull();
    });

    it('never calls the guest reserveUsername or releaseUsername for an account', async () => {
      mockFindAccountUsername.mockResolvedValue(null);
      mockClaimAccountUsername.mockResolvedValue(true);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      await act(async () => {
        await result.current.setUsername('Alice');
      });

      expect(mockReserveUsername).not.toHaveBeenCalled();
      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });

    it('returns false and keeps username null when the claim is refused', async () => {
      mockFindAccountUsername.mockResolvedValue(null);
      mockClaimAccountUsername.mockResolvedValue(false);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      let setUsernameResult = true;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('Taken');
      });

      expect(setUsernameResult).toBe(false);
      expect(result.current.username).toBeNull();
    });
  });

  describe('logout (account)', () => {
    beforeEach(() => {
      deferInitialAuthReport();
    });

    it('signs out of Firebase Auth and does not release any username', async () => {
      mockFindAccountUsername.mockResolvedValue('Alice');
      mockSignOutOfAccount.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSignOutOfAccount).toHaveBeenCalledTimes(1);
      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });

    it('does not remove the username from localStorage on logout', async () => {
      localStorage.setItem('username', 'Alice');
      mockFindAccountUsername.mockResolvedValue('Alice');
      mockSignOutOfAccount.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('username')).toBe('Alice');
    });

    it('logs and resolves when Firebase signOut fails', async () => {
      mockFindAccountUsername.mockResolvedValue('Alice');
      mockSignOutOfAccount.mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));

      await act(async () => {
        await expect(result.current.logout()).resolves.not.toThrow();
      });

      expect(console.error).toHaveBeenCalledWith('Error signing out:', expect.any(Error));
      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });
  });

  describe('beforeunload listener (account)', () => {
    beforeEach(() => {
      deferInitialAuthReport();
    });

    it('does not sign out or release anything when the tab closes while an account is signed in', async () => {
      localStorage.setItem('username', 'Alice');
      mockFindAccountUsername.mockResolvedValue('Alice');

      const { result } = renderHook(() => usePlayerProvider());
      await flushAuthCallback(() => emitAuthChange(ALICE));
      expect(result.current.username).toBe('Alice');

      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });
      await settle();

      expect(mockSignOutOfAccount).not.toHaveBeenCalled();
      expect(mockReleaseUsername).not.toHaveBeenCalled();
      expect(localStorage.getItem('username')).toBe('Alice');
    });
  });

  describe('signInWithGoogle', () => {
    it('resolves true when the Google sign-in succeeds', async () => {
      mockSignInWithGoogle.mockResolvedValue(ALICE);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      let signInResult = false;
      await act(async () => {
        signInResult = await result.current.signInWithGoogle();
      });

      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      expect(signInResult).toBe(true);
    });

    it('resolves false (does not throw) and logs when the popup fails', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('auth/popup-closed-by-user'));

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      let signInResult = true;
      await act(async () => {
        signInResult = await result.current.signInWithGoogle();
      });

      expect(signInResult).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error signing in with Google:', expect.any(Error));
    });

    it('does not set the identity directly; the auth listener is the source of truth', async () => {
      mockSignInWithGoogle.mockResolvedValue(ALICE);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.playerId).not.toBe('uid_alice');
    });

    it('releases the guest reservation and clears localStorage when a guest with a username signs in', async () => {
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('uid_guest_1');
      mockReleaseUsername.mockResolvedValue(undefined);
      mockSignInWithGoogle.mockResolvedValue(ALICE);

      const { result } = renderHook(() => usePlayerProvider());
      await settle();
      expect(result.current.username).toBe('testuser');

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockReleaseUsername).toHaveBeenCalledWith('testuser');
      expect(localStorage.getItem('username')).toBeNull();
    });
  });
});
