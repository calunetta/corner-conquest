'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  const setUsernameCallback = useCallback(async (name: string): Promise<boolean> => {
    // This is the key change. We check for playerId and if it's not ready, we fail gracefully.
    // The UI can retry. This prevents calling Firestore functions before initialization is complete.
    if (!playerId) {
      console.error("Player ID not initialized yet.");
      // You could also add a small delay and retry here, but for now, failing is safer.
      return false;
    }

    const usernameDocRef = doc(db, 'usernames', name);
    
    try {
      const docSnap = await getDoc(usernameDocRef);
      if (docSnap.exists() && docSnap.data().playerId !== playerId) {
        // Username is taken by someone else
        return false;
      }
      
      // If the username is not taken, or taken by the current player, claim it
      await setDoc(usernameDocRef, { playerId });
      
      // If user is renaming, release old username
      if (username && username !== name) {
          const oldUsernameDocRef = doc(db, 'usernames', username);
          await deleteDoc(oldUsernameDocRef);
      }

      localStorage.setItem('username', name);
      setUsernameState(name);
      return true;
    } catch (error) {
      console.error("Error setting username: ", error);
      // This is where the 'client is offline' error would be caught.
      // We return false so the UI can inform the user.
      return false;
    }
  }, [playerId, username]);

  const logout = useCallback(async () => {
    if (username) {
       const usernameDocRef = doc(db, 'usernames', username);
       await deleteDoc(usernameDocRef);
    }
    localStorage.removeItem('username');
    setUsernameState(null);
    // We keep the playerId in localStorage to maintain session uniqueness
  }, [username]);

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
