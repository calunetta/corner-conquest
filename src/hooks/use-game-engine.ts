
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, doc, onSnapshot, getDoc, updateDoc } from '@/lib/firebase';
import type { GameState, ActionHandlerResult } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

export function useGameEngine(gameId: string, playerId: string | null) {
  const [gameState, setInternalGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const gameStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const setGameState = useCallback(async (updateFn: (gs: GameState | null) => GameState | null | ActionHandlerResult): Promise<any> => {
    try {
        const gameDocRef = doc(db, 'games', gameId);
        
        const currentState = gameStateRef.current ?? await getDoc(gameDocRef).then(d => d.data() as GameState);
        
        if (!currentState) {
             console.error("Could not fetch current game state to perform an update.");
             return null;
        }

        const result = updateFn(currentState);
        
        if (!result) {
            console.warn("updateFn returned null. No update will be performed.");
            return null;
        }
        
        let finalState: GameState;
        let uiResult: ActionHandlerResult['ui'] = null;

        if ('state' in result && result.state) {
            finalState = result.state as GameState;
            uiResult = result.ui;
        } else {
            finalState = result as GameState;
        }

        if (!finalState) {
            console.error("updateGameState was called with null or returned null.");
            return null;
        }
    
        await updateDoc(gameDocRef, { ...finalState });
        return uiResult;

    } catch (error) {
        console.error("Error updating game state:", error);
        toast({ title: "Sync Error", description: "Could not save game state.", variant: 'destructive' });
        return null;
    }
  }, [gameId, toast]);

  useEffect(() => {
    if (!gameId) return;

    setIsLoading(true);

    const gameDocRef = doc(db, 'games', gameId);
    
    const unsubscribe = onSnapshot(gameDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data() as GameState;
            setInternalGameState(data);
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
  }, [gameId, toast, router]);


  const localPlayer = useMemo(() => {
    return gameState?.players.find(p => p.playerId === playerId) || null;
  }, [gameState, playerId]);
  
  const globallyRevealedTiles = useMemo(() => {
    const revealed = new Set<string>();
    if (gameState) {
        gameState.players.forEach(p => {
            p.revealedTiles.forEach(tileId => {
                revealed.add(tileId);
            });
        });
    }
    return revealed;
  }, [gameState?.players]);


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
    if (!isLoading && !localPlayer) {
      toast({ title: "Not in Game", description: "You are not a player in this game. Returning to lobby." });
      setTimeout(() => {
          router.push('/');
      }, 3000);
    }
  }, [isLoading, localPlayer, router, toast]);
  
  useEffect(() => {
    if (!isHost || !gameState?.deathAnimations || gameState.deathAnimations.length === 0) {
        return;
    }
    
    const animations = gameState.deathAnimations;
    const animationTimers = animations.map(anim => 
        setTimeout(() => {
            setGameState((currentState: GameState | null) => {
                if (!currentState) return null;
                return {
                    ...currentState,
                    deathAnimations: currentState.deathAnimations.filter(a => a.id !== anim.id),
                };
            });
        }, 1500)
    );

    return () => animationTimers.forEach(clearTimeout);
  }, [gameState?.deathAnimations, isHost, setGameState]);

  return { gameState, setGameState, isMyTurn, localPlayer, isHost, isLoading, globallyRevealedTiles };
}
