'use client';

import { useEffect, useRef } from 'react';
import type { CardRevealAnimation, DeathAnimation, GameState } from '@/lib/types';
import { clearDeathAnimations, clearCardRevealAnimations } from './services/game-board.engine.service';

interface UseAnimationCleanupParams {
  gameState: GameState | null;
  isSessionDriver: boolean;
  gameId: string;
  gameStateRef: React.MutableRefObject<GameState | null>;
}

/**
 * The session driver schedules a Firestore write that clears each transient animation entry
 * (death, card reveal) once its playback window has elapsed, so every viewer's tile stops
 * showing it. Mirrors `deathAnimations` for `cardRevealAnimations`; one hook because both
 * animation kinds share this exact scheduling mechanism and this is their only caller.
 */
export function useAnimationCleanup({ gameState, isSessionDriver, gameId, gameStateRef }: UseAnimationCleanupParams): void {
  const scheduledDeathAnimations = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSessionDriver || !gameState || !gameState.deathAnimations || gameState.deathAnimations.length === 0) {
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
  }, [gameState?.deathAnimations, isSessionDriver, gameId]);

  const scheduledCardRevealAnimations = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      !isSessionDriver ||
      !gameState ||
      !gameState.cardRevealAnimations ||
      gameState.cardRevealAnimations.length === 0
    ) {
      return;
    }

    gameState.cardRevealAnimations.forEach((anim) => {
      if (!scheduledCardRevealAnimations.current.has(anim.id)) {
        scheduledCardRevealAnimations.current.add(anim.id);
        const remainingTime = Math.max(100, anim.createdAt ? anim.createdAt + 1400 - Date.now() : 1400);

        setTimeout(() => {
          scheduledCardRevealAnimations.current.delete(anim.id);
          const currentAnims = gameStateRef.current?.cardRevealAnimations || [];
          const newAnims = currentAnims.filter((a: CardRevealAnimation) => a.id !== anim.id);
          if (newAnims.length !== currentAnims.length) {
            clearCardRevealAnimations(gameId, newAnims).catch((err) => {
              console.error('Error updating card reveal animations:', err);
            });
          }
        }, remainingTime);
      }
    });
    // Depends on the derived `gameState?.cardRevealAnimations` reference, not the whole `gameState` object, so
    // this doesn't reschedule on unrelated state changes (docs/ai/lessons-learned.md "Hooks & effects").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.cardRevealAnimations, isSessionDriver, gameId]);
}
