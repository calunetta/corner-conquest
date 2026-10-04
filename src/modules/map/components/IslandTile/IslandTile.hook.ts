import { useMemo } from 'react';
import { useGameBoard } from '@/modules/game-board';
import { DEATH_ANIMATION_DURATION } from '../DeathEffect';
import { toIslandTileViewModel } from './IslandTile.map';
import type { IslandTileProps, IslandTileViewModel } from './IslandTile.types';

const BORDER_IMAGES = [
  '/sprites/island_edge_1.gif',
  '/sprites/island_edge_2.gif',
  '/sprites/island_edge_3.gif',
];

/**
 * Simple deterministic hash from island coordinates.
 * Used to select a consistent middle sprite across server and client renders.
 */
function hashIsland(x: number, y: number): number {
  return Math.abs((x * 73856093) ^ (y * 19349663)) >>> 0;
}

export function useIslandTile(props: IslandTileProps): IslandTileViewModel {
  const { island } = props;
  const { gameState, localPlayer, uiState, selectedArmy, handleTileClick } = useGameBoard();

  const staticViewModel = toIslandTileViewModel(island, { gameState, localPlayer, uiState, selectedArmy });

  const now = Date.now();
  const deathAnimationOnTile = gameState.deathAnimations.find(
    (anim) =>
      anim.x === island.x &&
      anim.y === island.y &&
      (!anim.createdAt || now - anim.createdAt < DEATH_ANIMATION_DURATION),
  );

  // Deterministic sprite selection based on island coordinates.
  // Ensures server and client render the same middle sprite during hydration.
  const borderImageSequence = useMemo((): [string, string, string] => {
    const hash = hashIsland(island.x, island.y);
    const middleImage = BORDER_IMAGES[hash % BORDER_IMAGES.length];
    return [BORDER_IMAGES[0], middleImage, BORDER_IMAGES[1]];
  }, [island.x, island.y]);

  const onClick = (): void => {
    void handleTileClick(island.x, island.y);
  };

  return {
    ...staticViewModel,
    island,
    deathAnimationOnTile,
    borderImageSequence,
    onClick,
  };
}
