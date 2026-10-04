'use client';

import React from 'react';
import { MapZoomControls } from '../MapZoomControls';
import { MapDecorations } from '../MapDecorations';
import { IslandTile } from '../IslandTile';
import { useMapGrid } from './MapGrid.hook';
import { styles } from './MapGrid.styles';
import type { MapGridViewModel } from './MapGrid.types';

export function MapGridView({
  map,
  cols,
  isMobile,
  zoom,
  pan,
  defaultZoom,
  zoomIn,
  zoomOut,
  resetZoom,
  handlers,
}: MapGridViewModel) {
  return (
    <div className={styles.root} {...handlers} data-testid="map-canvas-container">
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
        className={styles.transformWrapper}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Ocean Background Canvas Frame */}
        <div className={styles.oceanFrame}>
          <MapDecorations isMobile={isMobile} />

          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${cols}, ${
                isMobile ? 'clamp(46px, 13.5vw, 68px)' : 'clamp(94px, 12.5vh, 136px)'
              })`,
              gap: isMobile ? 'clamp(4px, 1.2vw, 8px)' : 'clamp(12px, 1.8vh, 22px)',
            }}
          >
            {map.map((island) => (
              <IslandTile key={island.id} island={island} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapGrid() {
  const viewModel = useMapGrid();
  return viewModel ? <MapGridView {...viewModel} /> : null;
}
