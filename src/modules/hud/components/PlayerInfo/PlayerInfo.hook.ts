import { useGameBoard } from '@/features/game/context/GameBoardContext';
import { toPlayerInfoViewModel } from './PlayerInfo.map';
import type { PlayerInfoProps } from './PlayerInfo.types';
import type { PlayerInfoViewModel } from './PlayerInfo.types';

export function usePlayerInfo(props: PlayerInfoProps): PlayerInfoViewModel {
  const { turnTimer, isMyTurn } = useGameBoard();

  return toPlayerInfoViewModel(
    props.player,
    props.isCurrentPlayer,
    props.vpGoal ?? 10,
    turnTimer,
    isMyTurn,
  );
}
