import { useEffect, useRef } from 'react';
import type { GameState, Player } from '@/lib/types';
import type { toast as toastFn } from '@/modules/shared';
import {
  countIdleFarmArmies,
  findNewCollectionEntries,
  toCollectionToastContent,
  toIdleFarmToastContent,
} from './resource-collection-feedback.map';

export interface ResourceCollectionFeedbackArgs {
  gameState: GameState | null;
  localPlayer: Player | null;
  isMyTurn: boolean;
  toast: typeof toastFn;
}

/** Fires one toast per new resource-collection log entry for `localPlayer` (effect 1, keyed off
 *  `gameState.log` length seen so far — seeds on first render without toasting, so a page
 *  reload mid-match never replays history), and one "idle army" toast the instant `isMyTurn`
 *  transitions false→true with at least one eligible-but-unpositioned army (effect 2). No return
 *  value: side-effect only, mirrors `useStalenessCheck`. */
export function useResourceCollectionFeedback({
  gameState,
  localPlayer,
  isMyTurn,
  toast,
}: ResourceCollectionFeedbackArgs): void {
  const seenLogLength = useRef<number | null>(null);
  const wasMyTurn = useRef(isMyTurn);

  useEffect(() => {
    if (!gameState || !localPlayer) return;

    if (seenLogLength.current === null) {
      seenLogLength.current = gameState.log.length;
      return;
    }

    const newEntries = findNewCollectionEntries(gameState.log, seenLogLength.current, localPlayer.playerId);
    seenLogLength.current = gameState.log.length;

    newEntries.forEach((entry) => {
      const toastContent = toCollectionToastContent(entry);
      if (toastContent) toast(toastContent);
    });
  }, [gameState, localPlayer, toast]);

  useEffect(() => {
    const justBecameMyTurn = !wasMyTurn.current && isMyTurn;
    wasMyTurn.current = isMyTurn;
    if (!justBecameMyTurn || !gameState || !localPlayer) return;

    const idleCount = countIdleFarmArmies(gameState, localPlayer);
    const toastContent = toIdleFarmToastContent(idleCount);
    if (toastContent) toast(toastContent);
  }, [gameState, localPlayer, isMyTurn, toast]);
}
