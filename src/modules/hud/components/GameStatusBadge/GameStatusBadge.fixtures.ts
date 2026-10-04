import type { GameStatusBadgeViewModel } from './GameStatusBadge.types';

const baseTurnTimer = {
  formattedTime: '02:30',
  isExpiring: false,
};

const expiringTurnTimer = {
  formattedTime: '00:05',
  isExpiring: true,
};

export const waitingViewModel: GameStatusBadgeViewModel = {
  isWaiting: true,
  playerCount: 2,
  maxPlayers: 4,
  turnLabel: "Player's Turn",
  isMyTurn: false,
  formattedTime: '02:00',
  isExpiring: false,
};

export const playingMyTurnNotExpiringViewModel: GameStatusBadgeViewModel = {
  isWaiting: false,
  playerCount: 2,
  maxPlayers: 4,
  turnLabel: 'Your Turn',
  isMyTurn: true,
  formattedTime: baseTurnTimer.formattedTime,
  isExpiring: baseTurnTimer.isExpiring,
};

export const playingMyTurnExpiringViewModel: GameStatusBadgeViewModel = {
  isWaiting: false,
  playerCount: 2,
  maxPlayers: 4,
  turnLabel: 'Your Turn',
  isMyTurn: true,
  formattedTime: expiringTurnTimer.formattedTime,
  isExpiring: expiringTurnTimer.isExpiring,
};

export const playingOpponentTurnViewModel: GameStatusBadgeViewModel = {
  isWaiting: false,
  playerCount: 2,
  maxPlayers: 4,
  turnLabel: "Alice's Turn",
  isMyTurn: false,
  formattedTime: baseTurnTimer.formattedTime,
  isExpiring: baseTurnTimer.isExpiring,
};
