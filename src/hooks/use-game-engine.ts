import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { unflattenMap, flattenMap } from '@/lib/game-logic';
import type { GameState, FirestoreGameState } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

export function useGameEngine(gameId: string, playerId: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!gameId) return;
    const gameDocRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(gameDocRef, (docSnapshot) => {
      setIsLoading(true);
      if (docSnapshot.exists()) {
        const firestoreState = docSnapshot.data() as FirestoreGameState;
        setGameState({
          ...firestoreState,
          map: unflattenMap(firestoreState.map, firestoreState.mapSize),
        });
      } else {
        toast({ title: "Game Over", description: "This game session no longer exists." });
        // This will trigger a re-render on the main page, which will show the lobby
        router.push('/'); 
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      toast({ title: 'Connection Error', description: 'Could not connect to the game session.', variant: 'destructive'});
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [gameId, toast, router]);

  const updateGameState = async (newState: GameState) => {
    try {
        const gameDocRef = doc(db, 'games', gameId);
        
        const firestoreState: FirestoreGameState = {
            ...newState,
            map: flattenMap(newState.map),
            mapSize: newState.map.length,
        };

        // We set it locally first for responsiveness
        setGameState(newState);
        
        await setDoc(gameDocRef, firestoreState, { merge: true });

    } catch (error: any) {
        console.error("Error updating game state:", error);
        toast({ title: "Sync Error", description: `Could not save game state: ${error.message}`, variant: 'destructive' });
    }
  };

  const localPlayer = useMemo(() => {
    return gameState?.players.find(p => p.playerId === playerId) || null;
  }, [gameState, playerId]);

  const isMyTurn = useMemo(() => {
    if (!gameState || !localPlayer) return false;
    return gameState.players[gameState.currentPlayerIndex].id === localPlayer.id;
  }, [gameState, localPlayer]);

  const isHost = useMemo(() => {
    if (!gameState || !localPlayer) return false;
    return localPlayer.id === 0;
  }, [gameState, localPlayer]);


  useEffect(() => {
    // If the game state loads and the local player is not in the players list,
    // it means they were removed or the game is invalid. Redirect them.
    if (!isLoading && gameState && !localPlayer) {
        setTimeout(() => {
            router.push('/');
        }, 3000);
    }
  }, [isLoading, gameState, localPlayer, router]);


  return { gameState, setGameState: updateGameState, isMyTurn, localPlayer, isHost, isLoading };
}
