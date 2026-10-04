import { useState, useEffect, useCallback } from 'react';
import { findUsernameOwner, reserveUsername, releaseUsername } from './services/player-session.service';
import type { PlayerContextType } from './player.types';

function createPlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function usePlayerProvider(): PlayerContextType {
  const [playerId, setPlayerId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      let stored = localStorage.getItem('playerId');
      if (!stored) {
        stored = createPlayerId();
        localStorage.setItem('playerId', stored);
      }
      return stored;
    }
    return null;
  });
  const [username, setUsernameState] = useState<string | null>(null);

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

  useEffect(() => {
    let storedPlayerId = localStorage.getItem('playerId');
    if (!storedPlayerId) {
      storedPlayerId = createPlayerId();
      localStorage.setItem('playerId', storedPlayerId);
    }
    setPlayerId(storedPlayerId);

    const storedUsername = localStorage.getItem('username');
    if (storedUsername && storedPlayerId) {
      validateSession(storedPlayerId, storedUsername);
    }
  }, [validateSession]);

  const logout = useCallback(async () => {
    if (username) {
      try {
        await releaseUsername(username);
      } catch (error) {
        console.error('Error removing username on logout:', error);
      }
    }
    localStorage.removeItem('username');
    setUsernameState(null);
  }, [username]);

  const setUsernameCallback = useCallback(
    async (name: string): Promise<boolean> => {
      let currentPid = playerId;
      if (!currentPid && typeof window !== 'undefined') {
        currentPid = localStorage.getItem('playerId');
        if (!currentPid) {
          currentPid = createPlayerId();
          localStorage.setItem('playerId', currentPid);
        }
        setPlayerId(currentPid);
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
    [playerId, username],
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      // This is not guaranteed to run, but it's a best-effort attempt.
      // A more robust solution would involve server-side heartbeats.
      if (localStorage.getItem('username')) {
        logout();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [logout]);

  return { playerId, username, setUsername: setUsernameCallback, logout };
}
