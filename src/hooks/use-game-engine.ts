
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameState, FirestoreGameState, Player, Island } from '@/lib/types';
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

    let mapData: Island[][] | null = null;
    let unsubscribes: (() => void)[] = [];

    const fetchAndCombine = async () => {
        setIsLoading(true);
        try {
            const staticDocRef = doc(db, 'games', gameId, 'static', 'map');
            const mapDoc = await getDoc(staticDocRef);
            if (mapDoc.exists()) {
                mapData = mapDoc.data().map as Island[][];
            } else {
                throw new Error("Map data not found.");
            }

            const gameDocRef = doc(db, 'games', gameId);
            const unsubscribeGame = onSnapshot(gameDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const firestoreState = docSnapshot.data() as FirestoreGameState;
                    setGameState({
                        ...firestoreState,
                        map: mapData!, // Assume mapData is loaded
                    });
                } else {
                    toast({ title: "Game Over", description: "This game session no longer exists." });
                    if (unsubscribes.length > 0) unsubscribes.forEach(u => u());
                    router.push('/');
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Firestore snapshot error:", error);
                toast({ title: 'Connection Error', description: 'Could not connect to the game session.', variant: 'destructive'});
                setIsLoading(false);
            });

            unsubscribes.push(unsubscribeGame);

        } catch (error) {
             console.error("Failed to load game data:", error);
             toast({ title: 'Load Error', description: 'Could not load game data.', variant: 'destructive'});
             router.push('/');
        }
    };
    
    fetchAndCombine();

    return () => unsubscribes.forEach(u => u());
  }, [gameId, toast, router]);

  const updateGameState = useCallback(async (newStateOrFn: GameState | null | ((prevState: GameState | null) => GameState | null)) => {
    let finalState: GameState | null = null;
    if (typeof newStateOrFn === 'function') {
        const currentState = gameStateRef.current;
        if (currentState === null) {
             console.warn("Attempted to update a null game state.");
             return;
        }
        finalState = newStateOrFn(currentState);
    } else {
      finalState = newStateOrFn;
    }

    if (!finalState) {
        console.warn("Attempted to update game state with null.");
        return;
    }

    try {
        const { map, ...dynamicState } = finalState;
        const firestoreState: FirestoreGameState = dynamicState;

        const gameDocRef = doc(db, 'games', gameId);
        await setDoc(gameDocRef, firestoreState, { merge: true });

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
  
  useEffect(() => {
    if (!isHost || !gameStateRef.current?.deathAnimations || gameStateRef.current.deathAnimations.length === 0) {
        return;
    }
    
    const animations = gameStateRef.current.deathAnimations;
    const animationTimers = animations.map(anim => 
        setTimeout(() => {
            updateGameState(currentState => {
                if (!currentState) return null;
                return {
                    ...currentState,
                    deathAnimations: currentState.deathAnimations.filter(a => a.id !== anim.id),
                };
            });
        }, 1500)
    );

    return () => animationTimers.forEach(clearTimeout);
  }, [gameState?.deathAnimations, isHost, updateGameState]);


  useEffect(() => {
    if (isProcessingBotTurn.current) {
        return;
    }
    if (gameState && gameState.status === 'playing' && currentPlayer?.isBot && isHost) {
      isProcessingBotTurn.current = true;
      
      setTimeout(async () => {
        try {
            const latestState = gameStateRef.current;
            if (!latestState || !latestState.players[latestState.currentPlayerIndex]?.isBot || !isProcessingBotTurn.current) {
                isProcessingBotTurn.current = false;
                return;
            }

            console.log('Bot turn starting...');
            const nextState = await takeBotTurn(latestState);
            await updateGameState(nextState);
            console.log('Bot turn finished and state updated.');
        } catch (error) {
          console.error("Error during bot turn: ", error);
          if (gameStateRef.current) {
              const errorState = GameActions.handleEndTurn(gameStateRef.current);
              await updateGameState(errorState);
          }
        } finally {
            setTimeout(() => {
                isProcessingBotTurn.current = false;
            }, 500);
        }
      }, 2000);
    }
  }, [gameState, currentPlayer, isHost, updateGameState]);


  return { gameState, setGameState: updateGameState, isMyTurn, localPlayer, isHost, isLoading };
}

    