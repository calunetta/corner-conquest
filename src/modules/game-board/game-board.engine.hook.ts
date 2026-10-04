import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DeathAnimation, GameAction, GameState } from '@/lib/types';
import { useToast } from '@/modules/shared';
import { handleGameAction, takeBotTurn } from '@/modules/game-rules';
import { subscribeToGameState, saveGameState, clearDeathAnimations } from './services/game-board.engine.service';
import type { UseGameEngineResult } from './game-board.engine.types';

export function useGameEngine(gameId: string, playerId: string | null): UseGameEngineResult {
  const [gameState, setInternalGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const setGameState = useCallback(
    async (currentState: GameState, action: GameAction, payload?: unknown): Promise<void> => {
      try {
        const result = handleGameAction({ action, gameState: currentState, payload });
        if (result.state) {
          await saveGameState(gameId, result.state);
        }
      } catch (error) {
        console.error('Error handling game action:', error);
        toast({ title: 'Action Error', description: 'Could not process game action.', variant: 'destructive' });
      }
    },
    [gameId, toast],
  );

  useEffect(() => {
    if (!gameId) return;

    setIsLoading(true);

    const unsubscribe = subscribeToGameState(gameId, {
      onData: (data) => {
        setInternalGameState(data);
        setIsLoading(false);
      },
      onMissing: () => {
        toast({ title: 'Game Over', description: 'This game session no longer exists.' });
        router.push('/');
      },
      onError: (error) => {
        console.error('Firestore game state error:', error);
        toast({ title: 'Connection Error', description: 'Could not connect to the game session.', variant: 'destructive' });
        setIsLoading(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [gameId, toast, router]);

  const localPlayer = useMemo(() => {
    if (!gameState || !playerId) return null;
    return gameState?.players.find((p) => p.playerId === playerId) || null;
  }, [gameState, playerId]);

  const globallyRevealedTiles = useMemo(() => {
    const revealed = new Set<string>();
    if (gameState) {
      gameState.players.forEach((p) => {
        p.revealedTiles.forEach((tileId) => {
          revealed.add(tileId);
        });
      });
    }
    return revealed;
    // Depends on the derived `gameState?.players` reference, not the whole `gameState` object, so this
    // doesn't recompute on unrelated state changes (docs/ai/lessons-learned.md "Hooks & effects").
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast({ title: 'Not in Game', description: 'You are not a player in this game. Returning to lobby.' });
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

    gameState.deathAnimations.forEach((anim) => {
      if (!scheduledDeathAnimations.current.has(anim.id)) {
        scheduledDeathAnimations.current.add(anim.id);
        const remainingTime = Math.max(100, anim.createdAt ? anim.createdAt + 1250 - Date.now() : 1250);

        setTimeout(() => {
          scheduledDeathAnimations.current.delete(anim.id);
          const currentAnims = gameStateRef.current?.deathAnimations || [];
          const newAnims = currentAnims.filter((a: DeathAnimation) => a.id !== anim.id);
          if (newAnims.length !== currentAnims.length) {
            clearDeathAnimations(gameId, newAnims).catch((err) => {
              console.error('Error updating death animations:', err);
            });
          }
        }, remainingTime);
      }
    });
    // Depends on the derived `gameState?.deathAnimations` reference, not the whole `gameState` object, so
    // this doesn't reschedule on unrelated state changes (docs/ai/lessons-learned.md "Hooks & effects").
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
