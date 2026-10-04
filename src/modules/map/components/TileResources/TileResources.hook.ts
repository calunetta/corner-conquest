import { useGameBoard } from '@/modules/game-board';
import { toTileResourcesViewModel } from './TileResources.map';
import type { TileResourcesProps, ResourceNodeViewModel } from './TileResources.types';

export function useTileResources(props: TileResourcesProps): { nodes: ResourceNodeViewModel[] | null } {
  const { gameState } = useGameBoard();

  const nodes = toTileResourcesViewModel(props.island, props.isBase ?? false, gameState.players);

  return { nodes };
}
