import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { GameAction } from '@/lib/types';
import { toActionsPanelData } from './ActionsPanel.map';
import type { ActionsPanelViewModel } from './ActionsPanel.types';

export function useActionsPanel(): ActionsPanelViewModel {
  const {
    onAction,
    onLocalAction,
    localPlayer,
    gameState,
    isMyTurn,
    selectedArmy,
    uiState,
    turnTimer,
  } = useGameBoard();

  const { pendingAction } = uiState;

  const panelData = toActionsPanelData({
    localPlayer,
    gameState,
    isMyTurn,
    selectedArmy,
    pendingAction,
    turnTimer,
  });

  const onActionClick = (id: GameAction) => {
    switch (id) {
      case GameAction.local_Position:
        onLocalAction(GameAction.local_Position, { army: selectedArmy });
        break;
      case GameAction.local_Attack:
        onLocalAction(GameAction.local_Attack, { army: selectedArmy });
        break;
      case GameAction.local_ShowCards:
        onLocalAction(GameAction.local_ShowCards, { playerId: localPlayer.id });
        break;
      case GameAction.local_OpenAbilitiesShop:
        onLocalAction(GameAction.local_OpenAbilitiesShop);
        break;
      default:
        onAction(id);
    }
  };

  const onCancelAction = () => {
    onLocalAction(GameAction.local_CancelAction);
  };

  const onDeselectArmy = () => {
    onLocalAction(GameAction.local_DeselectArmy);
  };

  const onEndTurn = () => {
    onAction(GameAction.EndTurn);
  };

  return {
    ...panelData,
    onActionClick,
    onCancelAction,
    onDeselectArmy,
    onEndTurn,
  };
}
