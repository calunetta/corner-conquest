'use client';

import React, { useMemo } from 'react';
import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import { IslandTile } from './IslandTile';
import { MapDecorations } from './MapDecorations';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useGameBoard } from '../context/GameBoardContext';

export function MapGrid() {
  const { gameState, localPlayer, uiState, selectedArmy, handleTileClick } = useGameBoard();
  const isMobile = useIsMobile();
  const tileSize = isMobile ? 75 : 120;
  const gap = isMobile ? 16 : 32;

  const { map, players, deathAnimations, settings, debugMode } = gameState;
  const { possibleMoves, pendingAction, selectedArmyId } = uiState;

  const isTeleporting = pendingAction?.type === 'teleport';
  const isScouting = pendingAction?.type === 'scout';

  const cols = useMemo(() => {
    if (!map || map.length === 0) return MAP_COLS;
    return Math.max(...map.map(i => i.x), 0) + 1;
  }, [map]);

  const rows = useMemo(() => {
    if (!map || map.length === 0) return MAP_ROWS;
    return Math.max(...map.map(i => i.y), 0) + 1;
  }, [map]);

  const globallyRevealedTiles = useMemo(() => {
    const set = new Set<string>();
    players.forEach(p => p.revealedTiles.forEach(t => set.add(t)));
    return set;
  }, [players]);

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
        {map.map(island => {
          const isPossible = possibleMoves.some(p => p.x === island.x && p.y === island.y);
          const isSelected = !!selectedArmy && selectedArmy.position.x === island.x && selectedArmy.position.y === island.y;
          const isScoutTarget = isScouting && (debugMode ? false : settings.fogOfWar && localPlayer && !localPlayer.revealedTiles.includes(island.id));
          const isTeleportTarget = isTeleporting && (!selectedArmy || !(selectedArmy.position.x === island.x && selectedArmy.position.y === island.y));

          return (
            <IslandTile
              key={island.id}
              island={island}
              players={players}
              onClick={handleTileClick}
              isPossibleMove={isTeleporting ? selectedArmyId !== null : isPossible}
              isSelected={isSelected}
              isTeleporting={isTeleportTarget}
              isScoutTarget={isScoutTarget}
              deathAnimations={deathAnimations}
              fogOfWar={settings.fogOfWar}
              localPlayer={localPlayer}
              globallyRevealedTiles={globallyRevealedTiles}
              debugMode={debugMode}
            />
          );
        })}
      </div>
    </div>
  );
}
