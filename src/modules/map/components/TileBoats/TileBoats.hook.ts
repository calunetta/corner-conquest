import { useGameBoard } from '@/modules/game-board';
import { toTileBoatsViewModel } from './TileBoats.map';
import type { TileBoatsProps, BoatEntryViewModel } from './TileBoats.types';

export function useTileBoats(props: TileBoatsProps): { boats: BoatEntryViewModel[] | null } {
  const { gameState, localPlayer } = useGameBoard();

  const boats = toTileBoatsViewModel(
    props.island,
    gameState.players,
    localPlayer,
    gameState.debugMode,
    gameState.settings.fogOfWar,
  );

  return { boats };
}
