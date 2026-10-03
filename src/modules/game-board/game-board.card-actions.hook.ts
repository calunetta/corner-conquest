import { useCallback } from 'react';
import type { CardName } from '@/lib/types';
import { CardName as CardNameEnum, GameAction } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import { handleGameAction } from '@/lib/actions';
import type { CardActions, CardActionsArgs, CancelPayload, UseCardPayload } from './game-board.hook.types';

export function useCardActions({
  localGameState,
  setLocalGameState,
  localPlayer,
  uiState,
  dispatch,
  onAction,
  toast,
}: CardActionsArgs): CardActions {
  const handleCancelAction = useCallback(
    (payload?: CancelPayload) => {
      const cancelPayload: CancelPayload = { cardName: payload?.cardName };
      if (!cancelPayload.cardName) {
        if (uiState.pendingAction) {
          cancelPayload.cardName = uiState.pendingAction.cardName;
        } else if (localPlayer?.reinforceActive) {
          cancelPayload.cardName = CardNameEnum.Reinforce;
        } else if (localPlayer?.efficientActive) {
          cancelPayload.cardName = CardNameEnum.Efficient;
        } else if (localPlayer?.masterBuilderActive) {
          cancelPayload.cardName = CardNameEnum.MasterBuilder;
        } else if (localPlayer?.hasExtraMove) {
          cancelPayload.cardName = CardNameEnum.ExtraMove;
        }
      }
      if (uiState.pendingAction?.type === 'scout') {
        cancelPayload.scoutedTiles = uiState.pendingAction.scoutedTiles;
      }
      dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
      onAction(GameAction.CancelAction, cancelPayload);
    },
    [uiState.pendingAction, localPlayer, dispatch, onAction]
  );

  const handleUseCard = useCallback(
    (payload: UseCardPayload) => {
      try {
        const { cardName } = payload;
        if (!localGameState) return;
        const player = localGameState.players[localGameState.currentPlayerIndex];

        if (!player.specialCards.includes(cardName)) {
          throw new Error(`You do not have the ${cardName} card.`);
        }
        if (player.actionsThisTurn.includes(GameAction.UseCard)) {
          throw new Error('You can only use one card per turn.');
        }

        if (cardName === 'Teleport') {
          dispatch({
            type: 'SET_PENDING_ACTION',
            pendingAction: {
              type: 'teleport',
              cardName: 'Teleport',
            },
          });
          toast({
            title: 'Teleport Activated',
            description: 'Select an army (or keep selected), then choose any destination island to teleport!',
          });
          return;
        }

        const multiStepCards: CardName[] = ['Scout', 'Sabotage', 'Wealthy', 'Steal Resource'];
        const result = handleGameAction({ action: GameAction.UseCard, gameState: localGameState, payload: { cardName } });

        if (result.state) {
          setLocalGameState(result.state);

          if (multiStepCards.includes(cardName)) {
            // Sabotage, Wealthy and Steal Resource are runtime pending types that the PendingAction union
            // does not list (pre-existing gap, out of scope).
            dispatch({
              type: 'SET_PENDING_ACTION',
              pendingAction: {
                type: cardName.toLowerCase().replace(/ /g, '-'),
                cardName,
                ...(cardName === 'Scout' ? { count: 3, scoutedTiles: [] } : {}),
              } as unknown as PendingAction,
            });
            dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });

            if (cardName === 'Sabotage') dispatch({ type: 'SET_SABOTAGE_DIALOG', state: { isOpen: true } });
            else if (cardName === 'Wealthy') dispatch({ type: 'SET_WEALTHY_DIALOG', state: { isOpen: true } });
            else if (cardName === 'Steal Resource') dispatch({ type: 'SET_STEAL_RESOURCE_DIALOG', state: { isOpen: true } });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast({ title: 'Action Error', description: message, variant: 'destructive' });
      }
    },
    [localGameState, setLocalGameState, dispatch, toast]
  );

  return { handleCancelAction, handleUseCard };
}
