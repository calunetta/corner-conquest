import { useState, useEffect, useCallback } from 'react';
import { findUsernameOwner, reserveUsername, releaseUsername } from './services/player-session.service';
import {
  claimAccountUsername,
  findAccountUsername,
  signInWithGoogle as signInWithGoogleAccount,
  signOutOfAccount,
  subscribeToAuthState,
  type AuthAccount,
} from './services/account.service';
import { readOrCreateGuestPlayerId, releaseGuestReservation } from './guest-session';
import type { PlayerContextType } from './player.types';

export function usePlayerProvider(): PlayerContextType {
  const [guestPlayerId, setGuestPlayerId] = useState<string | null>(() => (typeof window !== 'undefined' ? readOrCreateGuestPlayerId() : null));
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [username, setUsernameState] = useState<string | null>(null);

  const playerId = account ? account.uid : guestPlayerId;
  const isGuest = !isAuthLoading && account === null;

  const validateSession = useCallback(async (pid: string, uname: string) => {
    try {
      const ownerId = await findUsernameOwner(uname);
      if (ownerId === pid) {
        setUsernameState(uname);
      } else {
        // Mismatch or document doesn't exist, clear local session
        localStorage.removeItem('username');
        setUsernameState(null);
      }
    } catch (error) {
      console.error('Error validating session:', error);
      localStorage.removeItem('username');
      setUsernameState(null);
    }
  }, []);

  const restoreAccountUsername = useCallback(async (authUid: string) => {
    try {
      setUsernameState(await findAccountUsername(authUid));
    } catch (error) {
      console.error('Error loading account username:', error);
    }
  }, []);

  useEffect(() => {
    return subscribeToAuthState(async (nextAccount) => {
      setAccount(nextAccount);
      setUsernameState(null);
      if (nextAccount) {
        await restoreAccountUsername(nextAccount.uid);
      } else if (guestPlayerId) {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) await validateSession(guestPlayerId, storedUsername);
      }
      setIsAuthLoading(false);
    });
  }, [guestPlayerId, restoreAccountUsername, validateSession]);

  const releaseGuestSession = useCallback(async () => {
    await releaseGuestReservation(username);
    setUsernameState(null);
  }, [username]);

  const logout = useCallback(async () => {
    if (account) {
      try {
        await signOutOfAccount();
      } catch (error) {
        console.error('Error signing out:', error);
      }
      return;
    }
    await releaseGuestSession();
  }, [account, releaseGuestSession]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      await signInWithGoogleAccount();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return false;
    }
    // Without this, a guest who signs in mid-session leaves an orphaned usernames/<name> doc
    // that no one can claim again. Only a guest's reservation is released, never an account's.
    if (account === null) {
      await releaseGuestReservation(username);
    }
    return true;
  }, [account, username]);

  const setUsernameCallback = useCallback(
    async (name: string): Promise<boolean> => {
      if (account) {
        const isClaimed = await claimAccountUsername(name, account.uid);
        if (isClaimed) {
          setUsernameState(name);
        }
        return isClaimed;
      }

      let currentPid = guestPlayerId;
      if (!currentPid && typeof window !== 'undefined') {
        currentPid = readOrCreateGuestPlayerId();
        setGuestPlayerId(currentPid);
      }

      if (!currentPid) {
        console.error('Player ID not initialized yet.');
        return false;
      }

      try {
        const ownerId = await findUsernameOwner(name);
        if (ownerId !== null && ownerId !== currentPid) {
          // Username is taken by someone else
          return false;
        }

        // Reserve the new username
        await reserveUsername(name, currentPid);

        // Clean up old username if it's different
        if (username && username !== name) {
          try {
            await releaseUsername(username);
          } catch (e) {
            console.error('Could not delete old username reservation:', e);
          }
        }

        localStorage.setItem('username', name);
        setUsernameState(name);
        return true;
      } catch (error) {
        console.error('Error setting username: ', error);
        return false;
      }
    },
    [account, guestPlayerId, username],
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Best-effort guest cleanup. A signed-in account must survive tab close: Firebase Auth
      // persists its session, so only guest reservations are released here.
      if (account === null && localStorage.getItem('username')) {
        releaseGuestSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [account, releaseGuestSession]);

  return { playerId, username, isGuest, isAuthLoading, setUsername: setUsernameCallback, signInWithGoogle, logout };
}
