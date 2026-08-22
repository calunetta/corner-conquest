
'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, doc, onSnapshot, updateDoc, setDoc } from '@/lib/firebase';
import type { GameState, ActionHandlerResult, GameAction } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';
import { takeBotTurn } from '@/lib/bot-logic';
import { handleGameAction } from '@/lib/actions';

export function useGameEngine(gameId: string, playerId: string | null) {
  const [gameState, setInternalGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const setGameState = useCallback(async (
    currentState: GameState,
    action: GameAction,
    payload: any,
  ): Promise<void> => {
    try {
        const result = handleGameAction({ action, gameState: currentState, payload });
        if (result.state) {
            const gameDocRef = doc(db, 'games', gameId);
            await setDoc(gameDocRef, result.state);
        }
    } catch (error) {
        console.error("Error handling game action:", error);
        toast({ title: "Action Error", description: "Could not process game action.", variant: 'destructive' });
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
    if (!gameState || !playerId) return null;
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
  
  const gameStateRef = useRef<GameState | null>(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const scheduledDeathAnimations = useRef<Set<string>>(new Set());

  // Host is responsible for clearing death animations from database
  useEffect(() => {
    if (!isHost || !gameState || !gameState.deathAnimations || gameState.deathAnimations.length === 0) {
        return;
    }
    
    gameState.deathAnimations.forEach(anim => {
        if (!scheduledDeathAnimations.current.has(anim.id)) {
            scheduledDeathAnimations.current.add(anim.id);
            const remainingTime = Math.max(100, (anim.createdAt ? (anim.createdAt + 1500 - Date.now()) : 1500));
            
            setTimeout(() => {
                scheduledDeathAnimations.current.delete(anim.id);
                const gameDocRef = doc(db, 'games', gameId);
                const currentAnims = gameStateRef.current?.deathAnimations || [];
                const newAnims = currentAnims.filter((a: any) => a.id !== anim.id);
                if (newAnims.length !== currentAnims.length) {
                  updateDoc(gameDocRef, { deathAnimations: newAnims }).catch((err) => {
                    console.error('Error updating death animations:', err);
                  });
                }
            }, remainingTime);
        }
    });
  }, [gameState?.deathAnimations, isHost, gameId]);
  
  // Host is responsible for triggering bot turns
  useEffect(() => {
    if (isHost && gameState && gameState.status === 'playing' && gameState.players[gameState.currentPlayerIndex]?.isBot) {
        const botTurnTimeout = setTimeout(() => {
            takeBotTurn(gameState).catch((err) => {
                console.error('Error during bot turn execution:', err);
            });
        }, 1000);
        
        return () => clearTimeout(botTurnTimeout);
    }
  }, [gameState, isHost]);


  return { gameState, setGameState, isMyTurn, localPlayer, isHost, isLoading, globallyRevealedTiles };
}
