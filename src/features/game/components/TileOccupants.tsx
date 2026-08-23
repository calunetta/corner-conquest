'use client';

import React from 'react';
import Image from 'next/image';
import type { Island } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { PLAYER_DATA } from '@/lib/player-data';
import { cn } from '@/lib/utils';
import { useGameBoard } from '../context/GameBoardContext';

interface TileOccupantsProps {
  island: Island;
}

const positions = [
  { bottom: '0', left: '0', origin: 'origin-bottom-left' },
  { bottom: '0', right: '0', origin: 'origin-bottom-right' },
  { top: '0', left: '0', origin: 'origin-top-left' },
  { top: '0', right: '0', origin: 'origin-top-right' },
];

export function TileOccupants({ island }: TileOccupantsProps) {
  const { gameState, localPlayer } = useGameBoard();
  const { players, deathAnimations, debugMode, settings } = gameState;
  const fogOfWar = settings.fogOfWar;
  const isPersonallyRevealed = localPlayer ? localPlayer.revealedTiles.includes(island.id) : false;
  const now = Date.now();

  const occupants = island.occupants
    .map(o => {
      const player = players.find(p => p.id === o.playerId);
      const army = player?.armies.find(a => a.id === o.armyId);
      return { player, army, armyId: o.armyId };
    })
    .filter((item): item is { player: NonNullable<typeof item.player>; army: NonNullable<typeof item.army>; armyId: number } => !!item.player && !!item.army);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {occupants.map(({ player, army }, index) => {
        if (
          deathAnimations.some(
            anim =>
              anim.id === `army-${player.id}-${army.id}` &&
              (!anim.createdAt || now - anim.createdAt < 2000)
          )
        ) {
          return null;
        }

        let isArmyVisible;
        if (debugMode) {
          isArmyVisible = true;
        } else if (fogOfWar) {
          isArmyVisible =
            (localPlayer && player.id === localPlayer.id) ||
            island.type === IslandType.Base ||
            isPersonallyRevealed;
        } else {
          isArmyVisible = true;
        }

        if (!isArmyVisible) {
          return null;
        }

        const sprite = PLAYER_DATA[player.color]?.sprite;
        if (!sprite) return null;

        const pos = positions[index % 4];

        return (
          <div
            key={`army-sprite-${player.id}-${army.id}`}
            className={cn('absolute w-1/2 h-1/2', pos.origin, index >= 4 ? 'scale-90 opacity-90' : '')}
            style={{ top: pos.top, left: pos.left, right: pos.right, bottom: pos.bottom }}
          >
            <Image
              src={sprite.idle}
              alt={`${player.color} army`}
              width={64}
              height={64}
              className={cn(
                "absolute h-auto w-full max-w-[86px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]",
                'bottom-0 right-0',
                pos.origin.includes('top') && 'top-0',
                pos.origin.includes('bottom') && 'bottom-0',
                pos.origin.includes('left') && 'left-0',
                pos.origin.includes('right') && 'right-0',
                army.hasActed ? 'opacity-50' : ''
              )}
              unoptimized
            />
          </div>
        );
      })}
    </div>
  );
}
