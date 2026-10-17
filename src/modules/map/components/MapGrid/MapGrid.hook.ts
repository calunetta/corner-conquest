'use client';

import { useMemo } from 'react';
import { useGameBoard } from '@/modules/game-board';
import { assignTileVariants, useTileVariants } from '../TileVariants';
import { useIsMobile } from '@/modules/shared';
import { useMapPanZoom, DEFAULT_DESKTOP_ZOOM } from './MapGrid.pan-zoom.hook';
import { toGridDimensions, toVariantTiles } from './MapGrid.map';
import type { MapGridViewModel } from './MapGrid.types';

export function useMapGrid(): MapGridViewModel | null {
  const { gameState } = useGameBoard();
  const isMobile = useIsMobile();
  const variants = useTileVariants();
  const { zoom, pan, defaultZoom, zoomIn, zoomOut, resetZoom, handlers } = useMapPanZoom({
    initialZoom: DEFAULT_DESKTOP_ZOOM,
    isMobile,
  });

  const { map } = gameState;
  // Before the early return below, so the hook order stays the same on every render.
  const variantAssignments = useMemo(
    () => assignTileVariants(toVariantTiles(map ?? [], gameState.players), variants),
    [map, gameState.players, variants],
  );

  if (!map || map.length === 0) {
    return null;
  }

  const { cols, rows } = toGridDimensions(map);

  return {
    map,
    variantAssignments,
    cols,
    rows,
    isMobile,
    zoom,
    pan,
    defaultZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    handlers,
  };
}
