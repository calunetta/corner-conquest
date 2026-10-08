import type { GameState, Player } from '@/lib/types';
import { toResources } from '../PlayerInfo/PlayerInfo.map';
import type { GameBoardHeaderViewModel, TurnTimer } from './GameBoardHeader.types';

export function toGameBoardHeaderViewModel(
  gameState: GameState,
  isHost: boolean,
  isMyTurn: boolean,
  turnTimer: TurnTimer,
  localPlayer: Player | null,
): GameBoardHeaderViewModel {
  const { status, name, players, settings, currentPlayerIndex } = gameState;
  const canStartGame = status === 'waiting' && isHost && players.length > 1;

  return {
    gameName: name,
    isPlaying: status === 'playing',
    victoryPointGoal: settings.victoryPointGoal,
    canStartGame,
    turnPlayerName: players[currentPlayerIndex]?.name,
    isMyTurn,
    turnTimer: {
      formattedTime: turnTimer.formattedTime,
      isExpiring: turnTimer.isExpiring,
    },
    resources: localPlayer ? toResources(localPlayer) : [],
  };
}
