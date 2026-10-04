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

  // Picked once per mount, same as legacy IslandTile.tsx:82-85.
  const borderImageSequence = useMemo((): [string, string, string] => {
    const middleImage = BORDER_IMAGES[Math.floor(Math.random() * BORDER_IMAGES.length)];
    return [BORDER_IMAGES[0], middleImage, BORDER_IMAGES[1]];
  }, []);

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
