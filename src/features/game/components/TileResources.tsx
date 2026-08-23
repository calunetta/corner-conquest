'use client';

import React from 'react';
import type { Island } from '@/lib/types';
import { IslandType, PlayerColor } from '@/lib/types';
import { ResourceIcon } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useGameBoard } from '../context/GameBoardContext';

interface TileResourcesProps {
  island: Island;
}

const playerColorMap: Record<PlayerColor, { bg: string; border: string }> = {
  [PlayerColor.Blue]: { bg: 'bg-blue-500', border: 'border-blue-300' },
  [PlayerColor.Red]: { bg: 'bg-red-500', border: 'border-red-300' },
  [PlayerColor.Purple]: { bg: 'bg-purple-500', border: 'border-purple-300' },
  [PlayerColor.Yellow]: { bg: 'bg-yellow-400', border: 'border-yellow-200' },
};

export function TileResources({ island }: TileResourcesProps) {
  const { gameState } = useGameBoard();
  const { players } = gameState;
  const { resources, positionedBy = [], type: islandType } = island;
  const isBase = islandType === IslandType.Base;

  return (
    <>
      {resources.map((resource, index) => {
        const positionInfo = positionedBy.find(p => p.resource === resource.type);
        const positionedPlayer = positionInfo ? players.find(p => p.id === positionInfo.playerId) : null;

        return (
          <div key={`resource-group-${index}`} className="flex flex-col items-center gap-1">
            <div className={cn("flex items-center justify-center gap-1", isBase ? 'flex-row' : '')}>
              {Array.from({ length: resource.amount }).map((_, i) => (
                <ResourceIcon key={`${resource.type}-${i}`} type={resource.type} className="h-4 w-4 text-accent" />
              ))}
            </div>
            {positionedPlayer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-0.5 flex items-center justify-center gap-1">
                    {Array.from({ length: resource.amount }).map((_, i) => (
                      <div
                        key={`dot-${i}`}
                        className={cn('h-1.5 w-1.5 rounded-full', playerColorMap[positionedPlayer.color]?.bg)}
                      />
                    ))}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Positioned by {positionedPlayer.name}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      })}
    </>
  );
}
