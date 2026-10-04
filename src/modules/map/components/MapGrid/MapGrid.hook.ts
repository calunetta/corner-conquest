'use client';

import { useGameBoard } from '@/modules/game-board';
import { useIsMobile } from '@/modules/shared';
import { useMapPanZoom, DEFAULT_DESKTOP_ZOOM } from './MapGrid.pan-zoom.hook';
import { toGridDimensions } from './MapGrid.map';
import type { MapGridViewModel } from './MapGrid.types';

export function useMapGrid(): MapGridViewModel | null {
  const { gameState } = useGameBoard();
  const isMobile = useIsMobile();
  const { zoom, pan, defaultZoom, zoomIn, zoomOut, resetZoom, handlers } = useMapPanZoom({
    initialZoom: DEFAULT_DESKTOP_ZOOM,
    isMobile,
  });

  const { map } = gameState;

  if (!map || map.length === 0) {
    return null;
  }

  const { cols, rows } = toGridDimensions(map);

  return {
    map,
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
