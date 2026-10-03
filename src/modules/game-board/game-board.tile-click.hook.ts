import { useCallback } from 'react';
import { GameAction, IslandType } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import type { TileClickArgs } from './game-board.hook.types';

export function useTileClick({
  gameStateForDisplay,
  isMyTurn,
  uiState,
  dispatch,
  localPlayer,
  selectedArmy,
  onAction,
  toast,
}: TileClickArgs) {
  return useCallback(
    async (x: number, y: number) => {
      if (
        !gameStateForDisplay ||
        !isMyTurn ||
        gameStateForDisplay.status !== 'playing' ||
        uiState.isPerformingAction ||
        !localPlayer
      )
        return;

      if (uiState.pendingAction?.type === 'scout') {
        const tileId = `${x}-${y}`;
        if (!localPlayer.revealedTiles.includes(tileId)) {
          await onAction(GameAction.Scout, { x, y });
          const newCount = ((uiState.pendingAction as unknown as { count?: number }).count || 1) - 1;
          const newScouted = [...((uiState.pendingAction as unknown as { scoutedTiles?: string[] }).scoutedTiles || []), tileId];
          if (newCount <= 0) {
            dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
            await onAction(GameAction.UseCard, { cardName: 'Scout', isScout: true });
          } else {
            dispatch({
              type: 'SET_PENDING_ACTION',
              pendingAction: { ...uiState.pendingAction, count: newCount, scoutedTiles: newScouted },
            });
          }
        }
        return;
      }

      if (uiState.pendingAction?.type === 'teleport') {
        const myArmiesOnTile = localPlayer.armies.filter((a) => a.position.x === x && a.position.y === y);
        if (
          myArmiesOnTile.length > 0 &&
          (!selectedArmy || (selectedArmy.position.x === x && selectedArmy.position.y === y))
        ) {
          if (myArmiesOnTile.length === 1) {
            dispatch({ type: 'SET_SELECTED_ARMY', armyId: myArmiesOnTile[0].id });
          } else {
            dispatch({ type: 'SET_ARMY_SELECTION_DIALOG', state: { armies: myArmiesOnTile, x, y } });
          }
        } else if (selectedArmy) {
          const targetTile = gameStateForDisplay.map[y * gameStateForDisplay.settings.gridSize.cols + x];
          if (targetTile.type === IslandType.Base && targetTile.owner !== localPlayer.id) {
            toast({
              title: 'Invalid Teleport',
              description: "Cannot teleport onto an opponent's base island.",
              variant: 'destructive',
            });
            return;
          }
          await onAction(GameAction.Move, { army: selectedArmy, x, y, isTeleport: true });
          dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
          dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
        }
        return;
      }

      const isPossibleMove = uiState.possibleMoves.some((p) => p.x === x && p.y === y);
      if (selectedArmy && isPossibleMove) {
        const targetTile = gameStateForDisplay.map[y * gameStateForDisplay.settings.gridSize.cols + x];
        const isRevealedSpecial =
          targetTile.type === IslandType.Special && localPlayer.revealedTiles.includes(targetTile.id);
        await onAction(GameAction.Move, { army: selectedArmy, x, y });
        dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
        if (isRevealedSpecial) {
          dispatch({ type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG', state: { isOpen: true, roll: null, cardDrawn: null } });
        }
      } else {
        const armiesOnTile = localPlayer.armies.filter((a) => a.position.x === x && a.position.y === y) ?? [];

        if (armiesOnTile.length === 1) {
          if (uiState.selectedArmyId === armiesOnTile[0].id) {
            dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
          } else {
            dispatch({ type: 'SET_SELECTED_ARMY', armyId: armiesOnTile[0].id });
          }
        } else if (armiesOnTile.length > 1) {
          dispatch({ type: 'SET_ARMY_SELECTION_DIALOG', state: { armies: armiesOnTile, x, y } });
        } else {
          if (uiState.pendingAction) {
            onAction(GameAction.CancelAction, {
              cardName: (uiState.pendingAction as NonNullable<PendingAction>).cardName,
            });
          }
          dispatch({ type: 'SET_SELECTED_ARMY', armyId: null });
          dispatch({ type: 'SET_PENDING_ACTION', pendingAction: null });
        }
      }
    },
    [
      gameStateForDisplay,
      isMyTurn,
      uiState.isPerformingAction,
      uiState.pendingAction,
      uiState.possibleMoves,
      uiState.selectedArmyId,
      dispatch,
      localPlayer,
      selectedArmy,
      onAction,
      toast,
    ]
  );
}
