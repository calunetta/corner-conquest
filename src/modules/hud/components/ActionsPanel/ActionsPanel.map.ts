import type { Army, GameState, Player } from '@/lib/types';
import { GameAction } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import { HAND_LIMIT } from '@/lib/types';
import { getDisabledReason, isPendingMatch } from './ActionsPanel.disabledReasons';
import type { ActionViewModel, ActionsPanelData } from './ActionsPanel.types';

export interface ActionsPanelMapInput {
  localPlayer: Player;
  gameState: GameState;
  isMyTurn: boolean;
  selectedArmy: Army | null;
  pendingAction: PendingAction;
  turnTimer: { formattedTime: string; percentage: number; isExpiring: boolean };
}

export function toActionsPanelData(input: ActionsPanelMapInput): ActionsPanelData {
  const { localPlayer, gameState, isMyTurn, selectedArmy, pendingAction, turnTimer } = input;
  const { map, specialCardsDeck, settings } = gameState;

  const isCardActionInProgress = !!pendingAction;
  const currentTile = selectedArmy && map
    ? map[selectedArmy.position.y * settings.gridSize.cols + selectedArmy.position.x]
    : null;

  const hasArmyActed = localPlayer.hasExtraMove ? false : !!selectedArmy?.hasActed;
  const canUseCardForAbility = !localPlayer.actionsThisTurn.includes(GameAction.UseCard);

  const canPosition =
    selectedArmy &&
    currentTile &&
    (currentTile.type === 'resource' || currentTile.type === 'base') &&
    currentTile.resources.length > 0 &&
    !localPlayer.positions.some(p => p.armyId === selectedArmy.id) &&
    (!currentTile.monsters || currentTile.monsters.length === 0);

  const canAttack =
    selectedArmy &&
    currentTile &&
    (currentTile.occupants.some(o => o.playerId !== localPlayer.id) ||
      (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));

  let deployCost = localPlayer.nextArmyCost;
  if (localPlayer.reinforceActive && canUseCardForAbility) deployCost = 0;
  else if (localPlayer.efficientActive && canUseCardForAbility) deployCost = Math.ceil(deployCost / 2);

  const isCancellableActionInProgress =
    isCardActionInProgress ||
    localPlayer.reinforceActive ||
    localPlayer.efficientActive ||
    localPlayer.masterBuilderActive ||
    localPlayer.hasExtraMove;

  const mainActions: ActionViewModel[] = [
    {
      id: GameAction.local_Position,
      label: 'Position',
      icon: 'position',
      tooltip: 'Station an army on a resource to collect it at the start of your turn.',
      disabled: !isMyTurn || isCardActionInProgress || hasArmyActed || !canPosition,
      disabledReason: '',
      isPendingMatch: isPendingMatch('Position', pendingAction),
    },
    {
      id: GameAction.local_Attack,
      label: 'Attack',
      icon: 'attack',
      tooltip: 'Attack enemy armies or monsters on the same tile.',
      disabled: !isMyTurn || isCardActionInProgress || hasArmyActed || !canAttack,
      disabledReason: '',
      isPendingMatch: isPendingMatch('Attack', pendingAction),
    },
  ];

  const alwaysAvailableActions: ActionViewModel[] = [
    {
      id: GameAction.Deploy,
      label: `Deploy (${deployCost} Food)`,
      icon: 'deploy',
      tooltip: `Deploy a new army at your base. Costs ${deployCost} food.`,
      disabled:
        !isMyTurn ||
        isCardActionInProgress ||
        localPlayer.armies.length >= 5 ||
        localPlayer.actionsThisTurn.includes(GameAction.Deploy) ||
        localPlayer.resources.food < deployCost,
      disabledReason: '',
      isPendingMatch: isPendingMatch('Deploy', pendingAction),
    },
  ];

  const secondaryActions: ActionViewModel[] = [
    {
      id: GameAction.Upgrade,
      label: `Upgrade (${settings.upgradeCost} Wood)`,
      icon: 'upgrade',
      tooltip: `Increase your attack power. Max: 4. Costs ${settings.upgradeCost} wood.`,
      disabled:
        !isMyTurn ||
        isCardActionInProgress ||
        localPlayer.attackPower >= 4 ||
        localPlayer.actionsThisTurn.includes(GameAction.Upgrade) ||
        localPlayer.resources.wood < settings.upgradeCost,
      disabledReason: '',
      isPendingMatch: isPendingMatch('Upgrade', pendingAction),
    },
    {
      id: GameAction.BuyCard,
      label: 'Buy Card (10 Gold)',
      icon: 'buy-card',
      tooltip: 'Buy a special card from the deck. Costs 10 gold.',
      disabled:
        !isMyTurn ||
        isCardActionInProgress ||
        localPlayer.specialCards.length >= HAND_LIMIT ||
        localPlayer.actionsThisTurn.includes(GameAction.BuyCard) ||
        localPlayer.resources.gold < 10 ||
        (specialCardsDeck.length === 0 && gameState.discardPile.length === 0),
      disabledReason: '',
      isPendingMatch: isPendingMatch('Buy Card', pendingAction),
    },
    {
      id: GameAction.local_ShowCards,
      label: `Cards (${localPlayer.specialCards.length}/${HAND_LIMIT})`,
      icon: 'show-cards',
      tooltip: 'View and use your special cards.',
      disabled: localPlayer.specialCards.length === 0,
      disabledReason: '',
      isPendingMatch: isPendingMatch('Cards', pendingAction),
    },
    {
      id: GameAction.local_OpenAbilitiesShop,
      label: 'Abilities',
      icon: 'abilities-shop',
      tooltip: 'View and buy passive abilities.',
      disabled: !isMyTurn,
      disabledReason: '',
      isPendingMatch: isPendingMatch('Abilities', pendingAction),
    },
  ];

  // Set disabledReasons for all actions
  const allActions = [...mainActions, ...alwaysAvailableActions, ...secondaryActions];
  allActions.forEach(action => {
    if (action.disabled) {
      action.disabledReason = getDisabledReason(action, { localPlayer, gameState, isMyTurn, selectedArmy, pendingAction });
    }
  });

  return {
    mainActions,
    alwaysAvailableActions,
    secondaryActions,
    deckCount: specialCardsDeck.length,
    isMyTurn,
    hasSelectedArmy: !!selectedArmy,
    isCancellableActionInProgress,
    hasExtraMoveBanner: isMyTurn && localPlayer.hasExtraMove,
    isEndTurnDisabled: isCardActionInProgress,
    turnTimer,
  };
}
