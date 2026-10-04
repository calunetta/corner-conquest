import type { GameState } from '@/lib/types';
import type { GameBoardHeaderViewModel, TurnTimer } from './GameBoardHeader.types';

export function toGameBoardHeaderViewModel(
  gameState: GameState,
  isHost: boolean,
  isMyTurn: boolean,
  turnTimer: TurnTimer,
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
  };
}
