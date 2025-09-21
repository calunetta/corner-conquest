
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, doc, onSnapshot, getDoc, updateDoc } from '@/lib/firebase';
import type { GameState, FirestoreGameState, Player, Island } from '@/lib/types';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';
import { takeBotTurn } from '@/lib/bot-logic';
import { handleEndTurn } from '@/lib/actions/player';
import { MAP_COLS, MAP_ROWS } from '@/lib/game-logic';
import { isEqual, isObject, transform, forEach, isUndefined } from 'lodash';


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
 * Correctly handles setting a previously undefined property to null.
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare against
 * @return {Object}        Return a new object who represent the diff
 */
function getChangedFields(object: any, base: any): any {
  const changes = (obj: any, baseObj: any) => {
    return transform(obj, (result: any, value, key) => {
      if (!isEqual(value, baseObj[key])) {
        result[key] = (isObject(value) && isObject(baseObj[key]) && !Array.isArray(value))
          ? changes(value, baseObj[key])
          : value;
      }
    });
  };

  let initialChanges = changes(object, base);

  // Also check for keys that were in base but are now undefined or null in object
  forEach(base, (value, key) => {
      if (isUndefined(object[key]) && !isUndefined(value)) {
          // This key was removed
          initialChanges[key] = null; // Use null to represent deletion in Firestore
      }
  });

  // Check for keys that are new in object
  forEach(object, (value, key) => {
    if (isUndefined(base[key])) {
        initialChanges[key] = value;
    }
  });
  
  // This is a Firestore constraint. We cannot have undefined values.
  // We clean them up here. If a key was removed, it should be set to null above.
  initialChanges = transform(initialChanges, (result: any, value, key) => {
    if (value !== undefined) {
        result[key] = value;
    }
  });

  return initialChanges;
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
    
    let isUnsubscribed = false;

    const unsubscribeAll = () => {
        if (isUnsubscribed) return;
        isUnsubscribed = true;
        unsubscribeGame();
        unsubscribeMap();
    };

    const unsubscribeGame = onSnapshot(gameDocRef, (docSnapshot) => {
        if (isUnsubscribed) return;
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
        if (isUnsubscribed) return;
        console.error("Firestore dynamic state error:", error);
        toast({ title: 'Connection Error', description: 'Could not connect to the game session.', variant: 'destructive'});
        setIsLoading(false);
        unsubscribeAll();
    });

    const unsubscribeMap = onSnapshot(staticDocRef, (docSnapshot) => {
        if (isUnsubscribed) return;
        if (docSnapshot.exists()) {
            setStaticState(docSnapshot.data() as { map: Island[] });
            staticDataLoaded = true;
            if (dynamicDataLoaded) setIsLoading(false);
        } else {
            // This can happen if the host leaves, it's not necessarily an error state if the game doc is also gone.
            if (!dynamicDataLoaded) {
                 toast({ title: 'Map Error', description: 'Could not load the game map.', variant: 'destructive' });
                 setIsLoading(false);
                 unsubscribeAll();
            }
        }
    }, (error) => {
        if (isUnsubscribed) return;
        console.error("Firestore map state error:", error);
        toast({ title: 'Map Error', description: 'Could not load the game map.', variant: 'destructive' });
        setIsLoading(false);
        unsubscribeAll();
    });
    
    return () => {
        unsubscribeAll();
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
    
    const currentStateForDiff = gameStateRef.current;
    if (!currentStateForDiff) {
        console.error("Cannot calculate diff because previous state is null.");
        return;
    }
    
    const { map: newMap, ...newFirestoreState } = finalState;
    const { map: oldMap, ...oldFirestoreState } = currentStateForDiff;
    
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
