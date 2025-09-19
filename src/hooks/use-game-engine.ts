

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { unflattenMap, flattenMap } from '@/lib/game-logic';
import type { GameState, FirestoreGameState, Player } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';
import { takeBotTurn } from '@/lib/bot-logic';
import * as GameActions from '@/lib/game-actions';

export function useGameEngine(gameId: string, playerId: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const isProcessingBotTurn = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!gameId) return;
    const gameDocRef = doc(db, 'games', gameId);

    const unsubscribe = onSnapshot(gameDocRef, (docSnapshot) => {
      setIsLoading(true);
      if (docSnapshot.exists()) {
        const firestoreState = docSnapshot.data() as FirestoreGameState;
        setGameState({
          ...firestoreState,
          map: unflattenMap(firestoreState.map),
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

  const updateGameState = useCallback(async (newState: GameState | null | ((prevState: GameState | null) => GameState | null)) => {
    let finalState: GameState | null = null;
    if (typeof newState === 'function') {
        const currentState = gameStateRef.current;
        if (currentState === null) {
             console.warn("Attempted to update a null game state.");
             return;
        }
        finalState = newState(currentState);
    } else {
      finalState = newState;
    }

    if (!finalState) {
        console.warn("Attempted to update game state with null.");
        return;
    }

    try {
        const gameDocRef = doc(db, 'games', gameId);
        
        const firestoreState: FirestoreGameState = {
            ...finalState,
            map: flattenMap(finalState.map),
        };

        await setDoc(gameDocRef, firestoreState, { merge: true });
        // The local state will be updated by the onSnapshot listener,
        // so we don't call setGameState here to avoid potential race conditions.

    } catch (error: any) {
        console.error("Error updating game state:", error);
        toast({ title: "Sync Error", description: `Could not save game state: ${error.message}`, variant: 'destructive' });
    }
  }, [gameId, toast]);

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
  
  // Effect for handling death animations, only the host should clear them.
  useEffect(() => {
    if (!isHost || !gameStateRef.current?.deathAnimations || gameStateRef.current.deathAnimations.length === 0) {
        return;
    }
    
    const animations = gameStateRef.current.deathAnimations;
    const animationTimers = animations.map(anim => 
        setTimeout(() => {
            updateGameState(currentState => {
                if (!currentState) return null; // Safety check
                return {
                    ...currentState,
                    deathAnimations: currentState.deathAnimations.filter(a => a.id !== anim.id),
                };
            });
        }, 1500) // Duration of the death GIF
    );

    return () => animationTimers.forEach(clearTimeout);
  }, [gameState?.deathAnimations, isHost, updateGameState]);


  useEffect(() => {
    // Added isProcessingBotTurn check to prevent race conditions
    if (gameState && gameState.status === 'playing' && currentPlayer?.isBot && isHost && !isProcessingBotTurn.current) {
      isProcessingBotTurn.current = true;
      
      setTimeout(async () => {
        try {
            // Re-fetch the latest state before taking action to avoid stale state issues.
            const latestState = gameStateRef.current;
            if (!latestState || !latestState.players[latestState.currentPlayerIndex]?.isBot || isProcessingBotTurn.current === false) {
                isProcessingBotTurn.current = false;
                return;
            }

            console.log('Bot turn starting...');
            const nextState = takeBotTurn(latestState);
            await updateGameState(nextState);
            console.log('Bot turn finished and state updated.');
        } catch (error) {
          console.error("Error during bot turn: ", error);
          if (gameStateRef.current) {
              const errorState = GameActions.handleEndTurn(gameStateRef.current);
              await updateGameState(errorState);
          }
        } finally {
            // Set a brief timeout before allowing the next bot turn to start
            // This can prevent rapid, back-to-back turn processing in bot-only games
            setTimeout(() => {
                isProcessingBotTurn.current = false;
            }, 500);
        }
      }, 2000);
    }
  }, [gameState, currentPlayer, isHost, updateGameState]);


  return { gameState, setGameState: updateGameState, isMyTurn, localPlayer, isHost, isLoading };
}
