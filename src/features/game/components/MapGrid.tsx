'use client';

import React, { useMemo } from 'react';
import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { MapDecorations } from './MapDecorations';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useGameBoard } from '../context/GameBoardContext';

export function MapGrid() {
  const { gameState } = useGameBoard();
  const isMobile = useIsMobile();
  const tileSize = isMobile ? 75 : 120;
  const gap = isMobile ? 16 : 32;

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
    <div className="relative bg-water-pattern bg-repeat p-8 rounded-xl shadow-lg">
      <MapDecorations cols={cols} rows={rows} tileSize={tileSize} gap={gap} isMobile={isMobile} />

      <div
        className="grid z-10 relative"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {map.map(island => (
          <IslandTile key={island.id} island={island} />
        ))}
      </div>
    </div>
  );
}
