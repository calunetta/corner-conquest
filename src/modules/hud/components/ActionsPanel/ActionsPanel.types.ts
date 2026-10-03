import type { ReactNode } from 'react';
import type { GameAction } from '@/lib/types';

export type ActionIcon = 'position' | 'attack' | 'deploy' | 'upgrade' | 'buy-card' | 'show-cards' | 'abilities-shop';

export interface ActionViewModel {
  id: GameAction;
  label: string;
  icon: ActionIcon;
  tooltip: string;
  disabled: boolean;
  disabledReason: string;
  isPendingMatch: boolean;
}

export interface ActionsPanelData {
  mainActions: ActionViewModel[];
  alwaysAvailableActions: ActionViewModel[];
  secondaryActions: ActionViewModel[];
  deckCount: number;
  isMyTurn: boolean;
  hasSelectedArmy: boolean;
  isCancellableActionInProgress: boolean;
  hasExtraMoveBanner: boolean;
  isEndTurnDisabled: boolean;
  turnTimer: { formattedTime: string; percentage: number; isExpiring: boolean };
}

export interface ActionsPanelHandlers {
  onActionClick: (id: GameAction) => void;
  onCancelAction: () => void;
  onDeselectArmy: () => void;
  onEndTurn: () => void;
}

export type ActionsPanelViewModel = ActionsPanelData & ActionsPanelHandlers;

export interface ActionsPanelProps {
  infoBeacon?: ReactNode;
}
