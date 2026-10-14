import { ResourceType } from '@/lib/types';
import type { GameBoardHeaderViewModel, GameBoardHeaderViewProps } from './GameBoardHeader.types';

const baseTurnTimer = {
  formattedTime: '02:30',
  isExpiring: false,
};

const expiringTurnTimer = {
  formattedTime: '00:05',
  isExpiring: true,
};

const startingResources = [
  { type: ResourceType.Food, label: 'Food', value: 0, gainPulse: null },
  { type: ResourceType.Wood, label: 'Wood', value: 0, gainPulse: null },
  { type: ResourceType.Gold, label: 'Gold', value: 0, gainPulse: null },
];

const playingResources = [
  { type: ResourceType.Food, label: 'Food', value: 4, gainPulse: null },
  { type: ResourceType.Wood, label: 'Wood', value: 2, gainPulse: null },
  { type: ResourceType.Gold, label: 'Gold', value: 1, gainPulse: null },
];

export const waitingCanStartViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: false,
  victoryPointGoal: 30,
  canStartGame: true,
  turnPlayerName: undefined,
  isMyTurn: false,
  turnTimer: baseTurnTimer,
  resources: startingResources,
};

export const waitingCannotStartViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: false,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: undefined,
  isMyTurn: false,
  turnTimer: baseTurnTimer,
  resources: startingResources,
};

export const waitingNotHostViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: false,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: undefined,
  isMyTurn: false,
  turnTimer: baseTurnTimer,
  resources: startingResources,
};

export const playingMyTurnNotExpiringViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: true,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: 'You',
  isMyTurn: true,
  turnTimer: baseTurnTimer,
  resources: playingResources,
};

export const playingMyTurnExpiringViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: true,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: 'You',
  isMyTurn: true,
  turnTimer: expiringTurnTimer,
  resources: playingResources,
};

export const playingOpponentTurnViewModel: GameBoardHeaderViewModel = {
  gameName: 'Island Quest',
  isPlaying: true,
  victoryPointGoal: 30,
  canStartGame: false,
  turnPlayerName: 'Alice',
  isMyTurn: false,
  turnTimer: baseTurnTimer,
  resources: playingResources,
};

export const waitingCanStartProps: GameBoardHeaderViewProps = {
  ...waitingCanStartViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
  isBackgroundOn: true,
  onToggleBackground: () => {},
};

export const waitingCannotStartProps: GameBoardHeaderViewProps = {
  ...waitingCannotStartViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
  isBackgroundOn: true,
  onToggleBackground: () => {},
};

export const waitingNotHostProps: GameBoardHeaderViewProps = {
  ...waitingNotHostViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
  isBackgroundOn: true,
  onToggleBackground: () => {},
};

export const playingMyTurnNotExpiringProps: GameBoardHeaderViewProps = {
  ...playingMyTurnNotExpiringViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
  isBackgroundOn: true,
  onToggleBackground: () => {},
};

export const playingMyTurnExpiringProps: GameBoardHeaderViewProps = {
  ...playingMyTurnExpiringViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
  isBackgroundOn: true,
  onToggleBackground: () => {},
};

export const playingOpponentTurnProps: GameBoardHeaderViewProps = {
  ...playingOpponentTurnViewModel,
  isExiting: false,
  onExitClick: async () => {},
  onStartGame: async () => {},
  isBackgroundOn: true,
  onToggleBackground: () => {},
};

export const exitingProps: GameBoardHeaderViewProps = {
  ...playingMyTurnNotExpiringViewModel,
  isExiting: true,
  onExitClick: async () => {},
  onStartGame: async () => {},
  isBackgroundOn: true,
  onToggleBackground: () => {},
};

export const backgroundOnProps: GameBoardHeaderViewProps = {
  ...waitingCanStartProps,
  isBackgroundOn: true,
};

export const backgroundOffProps: GameBoardHeaderViewProps = {
  ...waitingCanStartProps,
  isBackgroundOn: false,
};
