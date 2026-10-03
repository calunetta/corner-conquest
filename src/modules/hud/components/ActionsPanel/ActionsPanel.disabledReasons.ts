import type { Army, GameState, Player } from '@/lib/types';
import { GameAction } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import { HAND_LIMIT } from '@/lib/types';
import type { ActionViewModel } from './ActionsPanel.types';

export interface DisabledReasonInput {
  localPlayer: Player;
  gameState: GameState;
  isMyTurn: boolean;
  selectedArmy: Army | null;
  pendingAction: PendingAction;
}

export function getDisabledReason(action: ActionViewModel, input: DisabledReasonInput): string {
  const { localPlayer, gameState, isMyTurn, selectedArmy } = input;
  const { map, specialCardsDeck, settings } = gameState;
  const isCardActionInProgress = !!input.pendingAction;

  const currentTile = selectedArmy && map
    ? map[selectedArmy.position.y * settings.gridSize.cols + selectedArmy.position.x]
    : null;

  const hasArmyActed = localPlayer.hasExtraMove ? false : !!selectedArmy?.hasActed;
  const canUseCardForAbility = !localPlayer.actionsThisTurn.includes(GameAction.UseCard);

  let deployCost = localPlayer.nextArmyCost;
  if (localPlayer.reinforceActive && canUseCardForAbility) deployCost = 0;
  else if (localPlayer.efficientActive && canUseCardForAbility) deployCost = Math.ceil(deployCost / 2);

  if (!isMyTurn) return "It's not your turn.";
  if (isCardActionInProgress && action.id !== GameAction.local_ShowCards) {
    return 'Complete or cancel the current card action first.';
  }

  if (action.id === GameAction.local_Attack || action.id === GameAction.local_Position) {
    if (!selectedArmy) return 'You must select an army first.';
    if (hasArmyActed) return 'This army has already acted this turn.';
  }

  switch (action.id) {
    case GameAction.BuyCard:
      if (localPlayer.resources.gold < 10) return 'Not enough gold. Cost: 10';
      if (localPlayer.specialCards.length >= HAND_LIMIT) return `Maximum hand limit reached (${HAND_LIMIT} cards).`;
      if (localPlayer.actionsThisTurn.includes(GameAction.BuyCard)) return "You've already bought a card this turn.";
      if (specialCardsDeck.length === 0 && gameState.discardPile.length === 0) return 'No cards remaining in the deck or discard pile.';
      return 'This action is not available.';

    case GameAction.Upgrade:
      if (localPlayer.resources.wood < settings.upgradeCost) return `Not enough wood. Cost: ${settings.upgradeCost}`;
      if (localPlayer.attackPower >= 4) return 'Maximum attack power reached (4).';
      if (localPlayer.actionsThisTurn.includes(GameAction.Upgrade)) return "You've already upgraded this turn.";
      return 'This action is not available.';

    case GameAction.Deploy:
      if (!(localPlayer.reinforceActive && canUseCardForAbility) && localPlayer.resources.food < deployCost) {
        return `Not enough food. Cost: ${deployCost}`;
      }
      if (localPlayer.armies.length >= 5) return 'Maximum army size reached (5 armies).';
      if (localPlayer.actionsThisTurn.includes(GameAction.Deploy)) return "You've already deployed this turn.";
      return 'This action is not available.';

    case GameAction.local_Attack:
      if (!selectedArmy) return 'You must select an army first.';
      if (!currentTile || (!currentTile.occupants.some(o => o.playerId !== localPlayer.id) && (!currentTile.monsters || currentTile.monsters.length === 0))) {
        return 'There is nothing to attack on this tile.';
      }
      return 'This action is not available.';

    case GameAction.local_Position:
      if (!selectedArmy) return 'You must select an army first.';
      if (localPlayer.positions.some(p => p.armyId === selectedArmy?.id)) return 'This army is already positioned.';
      if (!currentTile || (currentTile.type !== 'resource' && currentTile.type !== 'base') || currentTile.resources.length === 0) {
        return 'This tile has no resources to position on.';
      }
      if (currentTile.monsters && currentTile.monsters.length > 0) return 'Cannot position on an island with monsters.';
      return 'This action is not available.';

    case GameAction.local_ShowCards:
      if (localPlayer.specialCards.length === 0) return 'You have no special cards.';
      return 'This action is not available.';

    case GameAction.local_OpenAbilitiesShop:
      if (!isMyTurn) return 'Can only access shop on your turn.';
      return 'This action is not available.';

    default:
      return 'This action is not available.';
  }
}

export function isPendingMatch(actionLabel: string, pendingAction: PendingAction): boolean {
  if (!pendingAction || !('cardName' in pendingAction) || !pendingAction.cardName) {
    return false;
  }
  return pendingAction.cardName.toLowerCase().includes(actionLabel.toLowerCase());
}
