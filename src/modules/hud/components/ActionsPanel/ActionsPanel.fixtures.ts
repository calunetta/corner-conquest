import { GameAction } from '@/lib/types';
import type { ActionsPanelViewModel } from './ActionsPanel.types';

export const myTurnNoSelection: ActionsPanelViewModel = {
  mainActions: [
    {
      id: GameAction.local_Position,
      label: 'Position',
      icon: 'position',
      tooltip: 'Station an army on a resource to collect it at the start of your turn.',
      disabled: true,
      disabledReason: 'You must select an army first.',
      isPendingMatch: false,
    },
    {
      id: GameAction.local_Attack,
      label: 'Attack',
      icon: 'attack',
      tooltip: 'Attack enemy armies or monsters on the same tile.',
      disabled: true,
      disabledReason: 'You must select an army first.',
      isPendingMatch: false,
    },
  ],
  alwaysAvailableActions: [
    {
      id: GameAction.Deploy,
      label: 'Deploy (10 Food)',
      icon: 'deploy',
      tooltip: 'Deploy a new army at your base. Costs 10 food.',
      disabled: false,
      disabledReason: '',
      isPendingMatch: false,
    },
  ],
  secondaryActions: [
    {
      id: GameAction.Upgrade,
      label: 'Upgrade (5 Wood)',
      icon: 'upgrade',
      tooltip: 'Increase your attack power. Max: 4. Costs 5 wood.',
      disabled: false,
      disabledReason: '',
      isPendingMatch: false,
    },
    {
      id: GameAction.BuyCard,
      label: 'Buy Card (10 Gold)',
      icon: 'buy-card',
      tooltip: 'Buy a special card from the deck. Costs 10 gold.',
      disabled: false,
      disabledReason: '',
      isPendingMatch: false,
    },
    {
      id: GameAction.local_ShowCards,
      label: 'Cards (2/7)',
      icon: 'show-cards',
      tooltip: 'View and use your special cards.',
      disabled: false,
      disabledReason: '',
      isPendingMatch: false,
    },
    {
      id: GameAction.local_OpenAbilitiesShop,
      label: 'Abilities',
      icon: 'abilities-shop',
      tooltip: 'View and buy passive abilities.',
      disabled: false,
      disabledReason: '',
      isPendingMatch: false,
    },
  ],
  deckCount: 18,
  isMyTurn: true,
  hasSelectedArmy: false,
  isCancellableActionInProgress: false,
  hasExtraMoveBanner: false,
  isEndTurnDisabled: false,
  turnTimer: { formattedTime: '1:45', percentage: 85, isExpiring: false },
  onActionClick: () => {},
  onCancelAction: () => {},
  onDeselectArmy: () => {},
  onEndTurn: () => {},
};

export const armySelectedCanAttack: ActionsPanelViewModel = {
  ...myTurnNoSelection,
  hasSelectedArmy: true,
  mainActions: [
    {
      id: GameAction.local_Position,
      label: 'Position',
      icon: 'position',
      tooltip: 'Station an army on a resource to collect it at the start of your turn.',
      disabled: true,
      disabledReason: 'This tile has no resources to position on.',
      isPendingMatch: false,
    },
    {
      id: GameAction.local_Attack,
      label: 'Attack',
      icon: 'attack',
      tooltip: 'Attack enemy armies or monsters on the same tile.',
      disabled: false,
      disabledReason: '',
      isPendingMatch: false,
    },
  ],
};

export const cardActionInProgress: ActionsPanelViewModel = {
  ...myTurnNoSelection,
  isCancellableActionInProgress: true,
  isEndTurnDisabled: true,
  mainActions: [
    ...myTurnNoSelection.mainActions.map(a => ({ ...a, disabled: true, disabledReason: 'Complete or cancel the current card action first.' })),
  ],
  alwaysAvailableActions: [
    { ...myTurnNoSelection.alwaysAvailableActions[0], disabled: true, disabledReason: 'Complete or cancel the current card action first.' },
  ],
  secondaryActions: [
    { ...myTurnNoSelection.secondaryActions[0], disabled: true, disabledReason: 'Complete or cancel the current card action first.' },
    { ...myTurnNoSelection.secondaryActions[1], disabled: true, disabledReason: 'Complete or cancel the current card action first.', isPendingMatch: true },
    myTurnNoSelection.secondaryActions[2],
    { ...myTurnNoSelection.secondaryActions[3], disabled: true, disabledReason: 'Complete or cancel the current card action first.' },
  ],
};

export const extraMoveActive: ActionsPanelViewModel = {
  ...myTurnNoSelection,
  hasExtraMoveBanner: true,
  isCancellableActionInProgress: true,
  alwaysAvailableActions: [{ ...myTurnNoSelection.alwaysAvailableActions[0], label: 'Deploy (0 Food)' }],
};

export const notMyTurn: ActionsPanelViewModel = {
  ...myTurnNoSelection,
  isMyTurn: false,
  hasExtraMoveBanner: false,
  isCancellableActionInProgress: false,
  mainActions: [
    { ...myTurnNoSelection.mainActions[0], disabled: true, disabledReason: "It's not your turn." },
    { ...myTurnNoSelection.mainActions[1], disabled: true, disabledReason: "It's not your turn." },
  ],
  alwaysAvailableActions: [
    { ...myTurnNoSelection.alwaysAvailableActions[0], disabled: true, disabledReason: "It's not your turn." },
  ],
  secondaryActions: [
    { ...myTurnNoSelection.secondaryActions[0], disabled: true, disabledReason: "It's not your turn." },
    { ...myTurnNoSelection.secondaryActions[1], disabled: true, disabledReason: "It's not your turn." },
    myTurnNoSelection.secondaryActions[2], // Cards stays exactly as in myTurnNoSelection
    { ...myTurnNoSelection.secondaryActions[3], disabled: true, disabledReason: "It's not your turn." },
  ],
};
