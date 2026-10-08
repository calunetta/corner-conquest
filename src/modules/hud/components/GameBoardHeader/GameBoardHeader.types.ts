import type { GameBoardContextType } from '@/modules/game-board';
import type { ResourceStatViewModel } from '../PlayerInfo';

export type TurnTimer = GameBoardContextType['turnTimer'];

export interface GameBoardHeaderViewModel {
  gameName: string;
  isPlaying: boolean; // gameState.status === 'playing'
  victoryPointGoal: number; // gameState.settings.victoryPointGoal
  canStartGame: boolean; // status === 'waiting' && isHost && players.length > 1
  turnPlayerName: string | undefined; // players[currentPlayerIndex]?.name
  isMyTurn: boolean;
  turnTimer: { formattedTime: string; isExpiring: boolean };
  resources: ResourceStatViewModel[]; // local player's food/wood/gold; [] when there is no local player
}

export interface GameBoardHeaderViewProps extends GameBoardHeaderViewModel {
  isExiting: boolean; // uiState.isExiting
  onExitClick: () => Promise<void>; // passthrough of handleExitClick
  onStartGame: () => Promise<void>; // passthrough of handleStartGame
}
