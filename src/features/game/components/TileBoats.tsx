'use client';

import React from 'react';
import Image from 'next/image';
import type { Island, PlayerColor } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useGameBoard } from '../context/GameBoardContext';

interface TileBoatsProps {
  island: Island;
}

const COLLECTOR_IDLE_SPRITES: Record<PlayerColor, string> = {
  blue: '/sprites/collector_blue_idle.gif',
  red: '/sprites/collector_red_idle.gif',
  purple: '/sprites/collector_purple_idle.gif',
  yellow: '/sprites/collector_yellow_idle.gif',
};

// 4 discrete shoreline corner docks positioned cleanly INSIDE the island tile boundaries
export const BOAT_CORNER_POSITIONS = [
  { id: 'br', style: { bottom: '2px', right: '2px' } }, // Corner 0: Bottom-Right shore
  { id: 'tr', style: { top: '2px', right: '2px' } },    // Corner 1: Top-Right shore
  { id: 'tl', style: { top: '2px', left: '2px' } },     // Corner 2: Top-Left shore
  { id: 'bl', style: { bottom: '2px', left: '2px' } },  // Corner 3: Bottom-Left shore
];

export const TileBoats = React.memo(function TileBoats({ island }: TileBoatsProps) {
  const { gameState, localPlayer } = useGameBoard();
  const { players, debugMode, settings } = gameState;
  const fogOfWar = settings.fogOfWar;
  const isPersonallyRevealed = localPlayer ? localPlayer.revealedTiles.includes(island.id) : false;

  // Determine visibility
  let isTileVisible: boolean;
  if (debugMode) {
    isTileVisible = true;
  } else if (island.type === IslandType.Base) {
    isTileVisible = true;
  } else if (fogOfWar) {
    isTileVisible = isPersonallyRevealed;
  } else {
    isTileVisible = players.some(p => p.revealedTiles.includes(island.id));
  }

  if (!isTileVisible) {
    return null;
  }

  // Find occupants on this island
  const occupants = island.occupants
    .map(o => {
      const player = players.find(p => p.id === o.playerId);
      const army = player?.armies.find(a => a.id === o.armyId);
      return { player, army, armyId: o.armyId, playerId: o.playerId };
    })
    .filter((item): item is { player: NonNullable<typeof item.player>; army: NonNullable<typeof item.army>; armyId: number; playerId: number } => !!item.player && !!item.army);

  // If this is a player's base tile, dock the owner's boat
  const isBase = island.type === IslandType.Base;
  const baseOwner = isBase && island.owner !== undefined ? players.find(p => p.id === island.owner) : null;

  type BoatEntry = {
    key: string;
    player: (typeof players)[0];
    armyId?: number;
    showIdleCollector: boolean;
  };

  const boatEntries: BoatEntry[] = [];

  if (occupants.length > 0) {
    occupants.forEach(({ player, armyId }) => {
      // Check if this army is actively positioned on a resource
      const isPositionedOnResource = (island.positionedBy || []).some(
        pos => pos.playerId === player.id
      );

      boatEntries.push({
        key: `boat-${player.id}-${armyId}`,
        player,
        armyId,
        showIdleCollector: !isPositionedOnResource,
      });
    });
  } else if (baseOwner) {
    // Base tile starts with owner's boat attached
    const isBasePositioned = (island.positionedBy || []).some(
      pos => pos.playerId === baseOwner.id
    );
    boatEntries.push({
      key: `boat-base-${baseOwner.id}`,
      player: baseOwner,
      showIdleCollector: !isBasePositioned,
    });
  }

  if (boatEntries.length === 0) {
    return null;
  }

  const getCornerPosition = (entryIndex: number, isBaseTile: boolean, ownerId?: number) => {
    if (isBaseTile && ownerId !== undefined) {
      const baseCornerMap: Record<number, number> = {
        0: 0, // Blue (top-left base 0,0) -> 'br' bottom-right shore
        1: 1, // Red (bottom-right base 4,4) -> 'tr' top-right shore
        2: 1, // Yellow (bottom-left base 0,4) -> 'tr' top-right shore
        3: 3, // Purple (top-right base 4,0) -> 'bl' bottom-left shore
      };
      const cornerIdx = baseCornerMap[ownerId] ?? (entryIndex % BOAT_CORNER_POSITIONS.length);
      return BOAT_CORNER_POSITIONS[cornerIdx];
    }
    return BOAT_CORNER_POSITIONS[entryIndex % BOAT_CORNER_POSITIONS.length];
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-25 select-none" data-testid="tile-boats">
      {boatEntries.map((entry, index) => {
        const corner = getCornerPosition(index, isBase, baseOwner?.id);
        const idleCollectorSprite = COLLECTOR_IDLE_SPRITES[entry.player.color];

        return (
          <div key={entry.key} className="absolute" style={corner.style}>
            {/* Docked Shoreline Boat Sprite (Cleanly inside tile) */}
            <div
              data-testid="docked-boat"
              className="relative w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-110"
            >
              <Image
                src="/sprites/boat.gif"
                alt={`${entry.player.color} boat`}
                width={32}
                height={32}
                className="h-full w-full object-contain"
                unoptimized
              />

              {/* Idle Collector standing by the boat */}
              {entry.showIdleCollector && idleCollectorSprite && (
                <div
                  data-testid={`collector-idle-${entry.player.color}`}
                  className="absolute z-26 w-5 h-5 sm:w-6 sm:h-6 -top-2.5 -left-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                >
                  <Image
                    src={idleCollectorSprite}
                    alt={`${entry.player.color} collector idle`}
                    width={24}
                    height={24}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
