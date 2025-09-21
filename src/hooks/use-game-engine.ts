
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, doc, onSnapshot, getDoc, updateDoc } from '@/lib/firebase';
import type { GameState, FirestoreGameState, Player, Island } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';
import { takeBotTurn } from '@/lib/bot-logic';
import { handleEndTurn } from '@/lib/actions/player';
import { MAP_COLS, MAP_ROWS } from '@/lib/game-logic';
import { isEqual, isObject, transform } from 'lodash';


function reconstructMap(flatMap: Island[]): Island[][] {
    if (!flatMap || flatMap.length === 0) return Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(null));
    const map: Island[][] = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(null));
    flatMap.forEach(island => {
        if (island && map[island.y]) {
            map[island.y][island.x] = island;
        }
    });
    return map;
}

/**
 * Deep diff between two objects, returning the new values.
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare against
 * @return {Object}        Return a new object who represent the diff
 */
function getChangedFields(object: any, base: any) {
  function changes(object: any, base: any) {
    return transform(object, function (result: any, value, key) {
      if (!isEqual(value, base[key])) {
        result[key] =
          isObject(value) && isObject(base[key])
            ? changes(value, base[key])
            : value;
      }
    });
  }
  return changes(object, base);
}


export function useGameEngine(gameId: string, playerId: string | null) {
  const [dynamicState, setDynamicState] = useState<FirestoreGameState | null>(null);
  const [staticState, setStaticState] = useState<{ map: Island[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const isProcessingBotTurn = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);

  const gameState = useMemo<GameState | null>(() => {
    if (!dynamicState || !staticState) return null;
    const map = reconstructMap(staticState.map);
    return { ...dynamicState, map: map };
  }, [dynamicState, staticState]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!gameId) return;

    setIsLoading(true);
    let dynamicDataLoaded = false;
    let staticDataLoaded = false;

    const gameDocRef = doc(db, 'games', gameId);
    const staticDocRef = doc(db, 'games', gameId, 'static', 'map');

    const unsubscribeGame = onSnapshot(gameDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            setDynamicState(docSnapshot.data() as FirestoreGameState);
            dynamicDataLoaded = true;
            if (staticDataLoaded) setIsLoading(false);
        } else {
            toast({ title: "Game Over", description: "This game session no longer exists." });
            unsubscribeAll();
            router.push('/');
        }
    }, (error) => {
        console.error("Firestore dynamic state error:", error);
        toast({ title: 'Connection Error', description: 'Could not connect to the game session.', variant: 'destructive'});
        setIsLoading(false);
    });

    const unsubscribeMap = onSnapshot(staticDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            setStaticState(docSnapshot.data() as { map: Island[] });
            staticDataLoaded = true;
            if (dynamicDataLoaded) setIsLoading(false);
        }
    }, (error) => {
        console.error("Firestore map state error:", error);
        toast({ title: 'Map Error', description: 'Could not load the game map.', variant: 'destructive' });
        setIsLoading(false);
    });
    
    const unsubscribeAll = () => {
        unsubscribeGame();
        unsubscribeMap();
    };

    return () => {
        unsubscribeAll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, toast, router]);

  const updateGameState = useCallback(async (newStateOrFn: GameState | null | ((prevState: GameState | null) => GameState | null)) => {
    const currentState = gameStateRef.current;
    if (!currentState) return;

    let finalState: GameState | null = null;
    if (typeof newStateOrFn === 'function') {
        finalState = newStateOrFn(currentState);
    } else {
      finalState = newStateOrFn;
    }

    if (!finalState) return;
    
    const { map: newMap, ...newFirestoreState } = finalState;
    const { map: oldMap, ...oldFirestoreState } = currentState;
    
    try {
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameDocRef);
        if (!gameDoc.exists()) {
            console.warn("Attempted to update a non-existent game document.");
            return;
        }

        const dynamicChanges = getChangedFields(newFirestoreState, oldFirestoreState);
        if (Object.keys(dynamicChanges).length > 0) {
            await updateDoc(gameDocRef, dynamicChanges);
        }
        
        const newFlatMap = newMap.flat();
        const oldFlatMap = oldMap.flat();
        const staticChanges = getChangedFields({ map: newFlatMap }, { map: oldFlatMap });

        if (staticChanges && Object.keys(staticChanges).length > 0) {
            const staticDocRef = doc(db, 'games', gameId, 'static', 'map');
            await updateDoc(staticDocRef, staticChanges);
        }

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
