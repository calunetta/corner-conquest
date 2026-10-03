import { useCallback } from 'react';
import { GameAction } from '@/lib/types';
import { handleGameAction } from '@/lib/actions';
import type { GameBoardActionsArgs, OnAction } from './game-board.hook.types';

export function useGameBoardActions({
  isPerformingAction,
  isMyTurn,
  localGameState,
  serverGameState,
  setGameState,
  setLocalGameState,
}: GameBoardActionsArgs): OnAction {
  return useCallback(
    async (action: GameAction, payload?: unknown) => {
      if (isPerformingAction) return;

      const stateToUpdate = isMyTurn && localGameState ? localGameState : serverGameState;

      if (!stateToUpdate) {
        console.warn(`Attempted to perform action ${action} with no state available. Aborting.`);
        return;
      }

      if (action === GameAction.EndTurn) {
        if (localGameState) {
          await setGameState(localGameState, action, payload);
          setLocalGameState(null);
        }
        return;
      }

      if (action === GameAction.InitiateCombat) {
        const payloadObj = payload as Record<string, unknown> | undefined;
        if (payloadObj?.target && (payloadObj.target as Record<string, unknown>)?.type === 'monster') {
          const result = handleGameAction({ action, gameState: stateToUpdate, payload });
          if (result.state) setLocalGameState(result.state);
          return;
        }
      }

      const realTimeActions: readonly GameAction[] = [
        GameAction.InitiateCombat,
        GameAction.CombatRoll,
        GameAction.CloseCombat,
        GameAction.MonsterCombatRoll,
        GameAction.CloseMonsterCombat,
        GameAction.HostLeave,
        GameAction.CloseSpecialIslandDialog,
        GameAction.RollOnSpecialIsland,
        GameAction.UseProductiveCard,
      ];

      if (realTimeActions.includes(action)) {
        const result = handleGameAction({ action, gameState: stateToUpdate, payload });
        if (result.state) {
          setLocalGameState(result.state);
        }
        await setGameState(stateToUpdate, action, payload);
      } else {
        const result = handleGameAction({ action, gameState: stateToUpdate, payload });
        if (result.state) {
          setLocalGameState(result.state);
        }
      }
    },
    [isPerformingAction, isMyTurn, localGameState, serverGameState, setGameState, setLocalGameState]
  );
}
