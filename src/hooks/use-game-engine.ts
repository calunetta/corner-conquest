import { useState, useEffect, useMemo, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { unflattenMap, flattenMap, MAP_ROWS, MAP_COLS } from '@/lib/game-logic';
import type { GameState, FirestoreGameState, Player } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';
import { takeBotTurn } from '@/lib/bot-logic';

export function useGameEngine(gameId: string, playerId: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const isProcessingBotTurn = useRef(false);

  useEffect(() => {
    if (!gameId) return;
    const gameDocRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(gameDocRef, (docSnapshot) => {
      setIsLoading(true);
      if (docSnapshot.exists()) {
        const firestoreState = docSnapshot.data() as FirestoreGameState;
        setGameState({
          ...firestoreState,
          map: unflattenMap(firestoreState.map, MAP_ROWS, MAP_COLS),
        });
      } else {
        toast({ title: "Game Over", description: "This game session no longer exists." });
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
        };

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

  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex];
  }, [gameState]);


  const isMyTurn = useMemo(() => {
    if (!currentPlayer || !localPlayer) return false;
    return currentPlayer.id === localPlayer.id;
  }, [currentPlayer, localPlayer]);

  const isHost = useMemo(() => {
    if (!gameState || !localPlayer) return false;
    return localPlayer.id === 0;
  }, [gameState, localPlayer]);


  useEffect(() => {
    if (!isLoading && gameState && !localPlayer) {
        setTimeout(() => {
            router.push('/');
        }, 3000);
    }
  }, [isLoading, gameState, localPlayer, router]);

  useEffect(() => {
    if (gameState && gameState.status === 'playing' && currentPlayer?.isBot && !isProcessingBotTurn.current) {
      isProcessingBotTurn.current = true;
      // Use a short delay to make the bot's turn feel more natural
      setTimeout(async () => {
        try {
          const nextState = takeBotTurn(gameState);
          await updateGameState(nextState);
        } catch (error) {
          console.error("Error during bot turn: ", error);
          // If bot fails, just end its turn to not stall the game
          await updateGameState({ ...gameState, currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length });
        } finally {
            isProcessingBotTurn.current = false;
        }
      }, 1000);
    }
  }, [gameState, currentPlayer, isProcessingBotTurn]);


  return { gameState, setGameState: updateGameState, isMyTurn, localPlayer, isHost, isLoading };
}

    