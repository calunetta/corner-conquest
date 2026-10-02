'use client';

import React, { useMemo } from 'react';
import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { MapDecorations } from './MapDecorations';
import { MapZoomControls } from './MapZoomControls';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useGameBoard } from '../context/GameBoardContext';
import { useMapPanZoom, DEFAULT_DESKTOP_ZOOM } from '../hooks/useMapPanZoom';

export function MapGrid() {
  const { gameState } = useGameBoard();
  const isMobile = useIsMobile();
  const { zoom, pan, defaultZoom, isDragging, zoomIn, zoomOut, resetZoom, handlers } = useMapPanZoom({
    initialZoom: DEFAULT_DESKTOP_ZOOM,
    isMobile,
  });

  const { map } = gameState;

  const cols = useMemo(() => {
    if (!map || map.length === 0) return MAP_COLS;
    return Math.max(...map.map(i => i.x), 0) + 1;
  }, [map]);

  const rows = useMemo(() => {
    if (!map || map.length === 0) return MAP_ROWS;
    return Math.max(...map.map(i => i.y), 0) + 1;
  }, [map]);

  if (!map || map.length === 0) return null;

  return (
    <div
      className="relative w-full h-full min-h-[340px] sm:min-h-[460px] flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing touch-none"
      {...handlers}
      data-testid="map-canvas-container"
    >
      {/* Zoom Controls Overlay */}
      <MapZoomControls
        zoom={zoom}
        defaultZoom={defaultZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
      />

      {/* Pan & Zoom Transform Wrapper */}
      <div
        className="transition-transform duration-75 ease-out flex items-center justify-center p-2 sm:p-6 md:p-10 will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Ocean Background Canvas Frame */}
        <div className="relative bg-water-pattern bg-repeat p-3 sm:p-5 md:p-8 rounded-3xl border border-white/20 shadow-[0_24px_72px_rgba(0,0,0,0.8)] flex items-center justify-center">
          <MapDecorations isMobile={isMobile} />

          <div
            className="grid z-10 relative"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${
                isMobile ? 'clamp(46px, 13.5vw, 68px)' : 'clamp(94px, 12.5vh, 136px)'
              })`,
              gap: isMobile ? 'clamp(4px, 1.2vw, 8px)' : 'clamp(12px, 1.8vh, 22px)',
            }}
          >
            {map.map(island => (
              <IslandTile key={island.id} island={island} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
