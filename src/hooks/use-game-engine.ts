
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, doc, onSnapshot, getDoc, updateDoc } from '@/lib/firebase';
import type { GameState, Player, Island } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';
import { takeBotTurn } from '@/lib/bot-logic';
import { handleEndTurn } from '@/lib/actions/player';
import { isEqual } from 'lodash';

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

    setIsLoading(true);

    const gameDocRef = doc(db, 'games', gameId);
    
    const unsubscribe = onSnapshot(gameDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data() as GameState;
            // Only update state if data has actually changed to prevent loops
            if (!isEqual(gameStateRef.current, data)) {
                setGameState(data);
            }
            setIsLoading(false);
        } else {
            toast({ title: "Game Over", description: "This game session no longer exists." });
            router.push('/');
        }
    }, (error) => {
        console.error("Firestore game state error:", error);
        toast({ title: 'Connection Error', description: 'Could not connect to the game session.', variant: 'destructive'});
        setIsLoading(false);
    });
    
    return () => {
        unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, toast, router]);

  const updateGameState = useCallback(async (newStateOrFn: GameState | null | ((prevState: GameState | null) => GameState | null)) => {
    
    let finalState: GameState | null = null;
    
    if (typeof newStateOrFn === 'function') {
        const currentState = gameStateRef.current;
        if (!currentState) {
            console.error("Cannot update state based on function because current state is null.");
            return;
        }
        finalState = newStateOrFn(currentState);
    } else {
      finalState = newStateOrFn;
    }

    if (!finalState) {
        console.error("updateGameState was called with null or returned null.");
        return;
    }
    
    try {
        const gameDocRef = doc(db, 'games', gameId);
        // Use setDoc to overwrite the entire document. This is simpler and safer
        // than calculating diffs, especially with complex nested state.
        // It ensures atomicity for the entire game state object.
        await updateDoc(gameDocRef, finalState);

    } catch (error) {
        console.error("Error updating game state:", error);
        toast({ title: "Sync Error", description: "Could not save game state.", variant: 'destructive' });
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
        toast({ title: "Not in Game", description: "You are not a player in this game. Returning to lobby." });
        setTimeout(() => {
            router.push('/');
        }, 3000);
    }
  }, [isLoading, gameState, localPlayer, router, toast]);
  
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
    const currentState = gameStateRef.current;
    if (isProcessingBotTurn.current || !currentState || currentState.status !== 'playing' || !currentState.players[currentState.currentPlayerIndex]?.isBot || !isHost) {
        return;
    }

    isProcessingBotTurn.current = true;
    
    setTimeout(async () => {
      try {
          if (!isProcessingBotTurn.current) return;
          const latestState = gameStateRef.current;
          if (!latestState || !latestState.players[latestState.currentPlayerIndex]?.isBot) {
              isProcessingBotTurn.current = false;
              return;
          }

          console.log('Bot turn starting...');
          const nextState = await takeBotTurn(latestState);
          await updateGameState(nextState);
          console.log('Bot turn finished and state updated.');
      } catch (error) {
        console.error("Error during bot turn: ", error);
        const stateAfterError = gameStateRef.current;
        if (stateAfterError) {
            try {
                const errorState = handleEndTurn(stateAfterError);
                await updateGameState(errorState);
            } catch (e) {
                 console.error("Failed to end turn after bot error:", e);
            }
        }
      } finally {
          setTimeout(() => {
              isProcessingBotTurn.current = false;
          }, 500);
      }
    }, 2000);
    
  }, [gameState, isHost, updateGameState]);


  return { gameState, setGameState: updateGameState, isMyTurn, localPlayer, isHost, isLoading };
}
