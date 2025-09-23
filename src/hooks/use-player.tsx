
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

  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedUsername = localStorage.getItem('username');
    if (storedPlayerId && storedUsername) {
      setPlayerId(storedPlayerId);
      setUsernameState(storedUsername);
    } else {
      const newPlayerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setPlayerId(newPlayerId);
      localStorage.setItem('playerId', newPlayerId);
    }
  }, []);
  
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
        return false;
      }
      
      await setDoc(usernameDocRef, { playerId });
      
      if (username && username !== name) {
          const oldUsernameDocRef = doc(db, 'usernames', username);
          await deleteDoc(oldUsernameDocRef);
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
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // The primary purpose of this is to run the logout logic
      // if the user closes the tab/browser. It's not guaranteed to run.
      logout();
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
