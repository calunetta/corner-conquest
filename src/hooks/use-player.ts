

'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, doc, setDoc, getDoc, deleteDoc } from '@/lib/firebase';

type PlayerContextType = {
  playerId: string | null;
  username: string | null;
  setUsername: (name: string) => Promise<boolean>;
  logout: () => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);

  const validateSession = useCallback(async (pid: string, uname: string) => {
    try {
        const usernameDocRef = doc(db, 'usernames', uname);
        const docSnap = await getDoc(usernameDocRef);
        if (docSnap.exists() && docSnap.data().playerId === pid) {
            setUsernameState(uname);
        } else {
            // Mismatch or document doesn't exist, clear local session
            localStorage.removeItem('username');
            setUsernameState(null);
        }
    } catch (error) {
        console.error("Error validating session:", error);
        localStorage.removeItem('username');
        setUsernameState(null);
    }
  }, []);

  useEffect(() => {
    let storedPlayerId = localStorage.getItem('playerId');
    if (!storedPlayerId) {
        storedPlayerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
        const usernameDocRef = doc(db, 'usernames', username);
        await deleteDoc(usernameDocRef);
       } catch (error) {
        console.error("Error removing username on logout:", error)
       }
    }
    localStorage.removeItem('username');
    setUsernameState(null);
  }, [username]);

  const setUsernameCallback = useCallback(async (name: string): Promise<boolean> => {
    if (!playerId) {
      console.error("Player ID not initialized yet.");
      return false;
    }

    const usernameDocRef = doc(db, 'usernames', name);
    
    try {
      const docSnap = await getDoc(usernameDocRef);
      if (docSnap.exists() && docSnap.data().playerId !== playerId) {
        // Username is taken by someone else
        return false;
      }
      
      // Reserve the new username
      await setDoc(usernameDocRef, { playerId });
      
      // Clean up old username if it's different
      if (username && username !== name) {
          try {
            const oldUsernameDocRef = doc(db, 'usernames', username);
            await deleteDoc(oldUsernameDocRef);
          } catch(e) {
            // Non-critical, log it
            console.warn("Could not delete old username reservation:", e);
          }
      }

      localStorage.setItem('username', name);
      setUsernameState(name);
      return true;
    } catch (error) {
      console.error("Error setting username: ", error);
      return false;
    }
  }, [playerId, username]);

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


  return (
    <PlayerContext.Provider value={{ playerId, username, setUsername: setUsernameCallback, logout }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
