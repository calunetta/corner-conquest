import { useCallback, useEffect } from 'react';
import type { Army, CardName } from '@/lib/types';
import { GameAction } from '@/lib/types';
import type { LocalActionsArgs } from './game-board.hook.types';

/** True while a card action is started but not completed, so cancelling it refunds the card. */
function hasPendingCardAction(
  pendingAction: LocalActionsArgs['uiState']['pendingAction'],
  localPlayer: LocalActionsArgs['localPlayer'] | undefined,
): boolean {
  return !!(
    pendingAction ||
    localPlayer?.reinforceActive ||
    localPlayer?.efficientActive ||
    localPlayer?.masterBuilderActive ||
    localPlayer?.hasExtraMove
  );
}

export function useLocalActions({
  localGameState,
  gameStateForDisplay,
  localPlayer,
  isMyTurn,
  uiState,
  dispatch,
  onAction,
  toast,
  handleCancelAction,
  handleUseCard,
}: LocalActionsArgs) {
  const handleLocalAction = useCallback(
    (action: string, payload?: unknown) => {
      if (!localGameState || !isMyTurn) return;

      const payloadObj = payload as Record<string, unknown> | undefined;

      switch (action) {
        case GameAction.local_DeselectArmy:
          dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
          if (hasPendingCardAction(uiState.pendingAction, localPlayer)) {
            handleCancelAction();
          }
          break;
        case GameAction.local_CancelAction:
          handleCancelAction({ cardName: payloadObj?.cardName as CardName | undefined });
          break;
        case GameAction.local_ShowCards:
          dispatch({ type: 'TOGGLE_CARDS_DIALOG', playerId: payloadObj?.playerId as number });
          break;
        case GameAction.local_CloseCards:
          dispatch({ type: 'TOGGLE_CARDS_DIALOG', playerId: null });
          break;
        case GameAction.local_OpenAbilitiesShop:
          dispatch({ type: 'SET_ABILITIES_SHOP_OPEN', open: true });
          break;
        case GameAction.local_CloseAbilitiesShop:
          dispatch({ type: 'SET_ABILITIES_SHOP_OPEN', open: false });
          break;
        case GameAction.local_Attack: {
          if (!localGameState || !localPlayer) return;
          const { army } = payloadObj as { army?: Army };
          if (!army) return;

          const currentTile =
            localGameState.map[army.position.y * localGameState.settings.gridSize.cols + army.position.x];
          const otherPlayersOccupants = currentTile.occupants.filter((o) => o.playerId !== localPlayer.id);
          const monsters = currentTile.monsters || [];

          if (otherPlayersOccupants.length > 0) {
            const defenderPlayer = localGameState.players.find((p) => p.id === otherPlayersOccupants[0].playerId);
            if (!defenderPlayer) return;
            const defendingArmies = otherPlayersOccupants
              .map((o) => defenderPlayer.armies.find((a) => a.id === o.armyId))
              .filter((a): a is Army => !!a);

            if (defendingArmies.length === 1) {
              onAction(GameAction.InitiateCombat, {
                attackingArmyId: army.id,
                target: { type: 'player', defenderId: defenderPlayer.id, defendingArmyId: defendingArmies[0].id },
              });
            } else {
              dispatch({
                type: 'SET_ATTACK_SELECTION_DIALOG',
                state: { attackingArmyId: army.id, defendingPlayer: defenderPlayer, armies: defendingArmies },
              });
            }
          } else if (monsters.length > 0) {
            if (monsters.length === 1) {
              onAction(GameAction.InitiateCombat, {
                attackingArmyId: army.id,
                target: { type: 'monster', monsterName: monsters[0].name },
              });
            } else {
              dispatch({ type: 'SET_MONSTER_SELECTION_DIALOG', state: { attackingArmyId: army.id, monsters } });
            }
          }
          break;
        }
        case GameAction.local_Position: {
          if (!gameStateForDisplay) return;
          const { army: posArmy } = payloadObj as { army: Army };
          const tile =
            gameStateForDisplay.map[
              posArmy.position.y * gameStateForDisplay.settings.gridSize.cols + posArmy.position.x
            ];
          const availableResources = tile?.resources.filter(
            (resource) => !(tile.positionedBy || []).some((p) => p.resource === resource.type)
          );
          if (availableResources && availableResources.length > 0) {
            dispatch({
              type: 'SET_POSITION_DIALOG',
              state: { x: posArmy.position.x, y: posArmy.position.y, resources: availableResources, armyId: posArmy.id },
            });
          } else {
            toast({ title: 'No available spots', description: 'All resource spots on this island are occupied.', variant: 'destructive' });
          }
          break;
        }
        case GameAction.local_UseCard:
          handleUseCard({ cardName: payloadObj?.cardName as CardName });
          break;
        default:
          console.warn('Unhandled local action:', action);
      }
    },
    [
      localGameState,
      isMyTurn,
      gameStateForDisplay,
      localPlayer,
      uiState.pendingAction,
      dispatch,
      onAction,
      toast,
      handleCancelAction,
      handleUseCard,
    ]
  );

  // Keyboard Escape Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (uiState.selectedArmyId !== null) {
          handleLocalAction(GameAction.local_DeselectArmy);
        } else if (hasPendingCardAction(uiState.pendingAction, localPlayer)) {
          handleLocalAction(GameAction.local_CancelAction);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiState.selectedArmyId, uiState.pendingAction, handleLocalAction, localPlayer]);

  return handleLocalAction;
}
