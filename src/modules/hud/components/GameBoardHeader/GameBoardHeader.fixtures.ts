import type { GameBoardHeaderViewModel, GameBoardHeaderViewProps } from './GameBoardHeader.types';

const baseTurnTimer = {
  formattedTime: '02:30',
  isExpiring: false,
};

const expiringTurnTimer = {
  formattedTime: '00:05',
  isExpiring: true,
};

export const waitingCanStartViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: false,
  victoryPointGoal: 30,
  canStartGame: true,
  turnPlayerName: undefined,
  isMyTurn: false,
  turnTimer: baseTurnTimer,
};

export const waitingCannotStartViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: false,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: undefined,
  isMyTurn: false,
  turnTimer: baseTurnTimer,
};

export const playingMyTurnNotExpiringViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: true,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: 'You',
  isMyTurn: true,
  turnTimer: baseTurnTimer,
};

export const playingMyTurnExpiringViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: true,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: 'You',
  isMyTurn: true,
  turnTimer: expiringTurnTimer,
};

export const playingOpponentTurnViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: true,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: 'Alice',
  isMyTurn: false,
  turnTimer: baseTurnTimer,
};

export const waitingCanStartProps: GameBoardHeaderViewProps = {
  ...waitingCanStartViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
};

export const waitingCannotStartProps: GameBoardHeaderViewProps = {
  ...waitingCannotStartViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
};

export const playingMyTurnNotExpiringProps: GameBoardHeaderViewProps = {
  ...playingMyTurnNotExpiringViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
};

export const playingMyTurnExpiringProps: GameBoardHeaderViewProps = {
  ...playingMyTurnExpiringViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
};

export const playingOpponentTurnProps: GameBoardHeaderViewProps = {
  ...playingOpponentTurnViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
};

export const exitingProps: GameBoardHeaderViewProps = {
  ...playingMyTurnNotExpiringViewModel,
  isExiting: true,
  onExitClick: async () => {},
  onStartGame: async () => {},
};
