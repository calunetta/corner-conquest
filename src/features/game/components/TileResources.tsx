'use client';

import React from 'react';
import Image from 'next/image';
import type { Island, ResourceType, PlayerColor } from '@/lib/types';
import { IslandType, ResourceType as ResourceTypeEnum } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useGameBoard } from '../context/GameBoardContext';

interface TileResourcesProps {
  island: Island;
  isBase?: boolean;
}

const FARM_SPRITES: Record<PlayerColor, string> = {
  blue: '/sprites/farm_blue.gif',
  red: '/sprites/farm_red.gif',
  purple: '/sprites/farm_purple.gif',
  yellow: '/sprites/farm_yellow.gif',
};

const RESOURCE_SPRITES: Record<ResourceType, { sprite: string; activeSprite: string }> = {
  [ResourceTypeEnum.Food]: {
    sprite: '/sprites/sheep.gif',
    activeSprite: '/sprites/sheep.gif',
  },
  [ResourceTypeEnum.Wood]: {
    sprite: '/sprites/tree.gif',
    activeSprite: '/sprites/tree.gif',
  },
  [ResourceTypeEnum.Gold]: {
    sprite: '/sprites/mine.png',
    activeSprite: '/sprites/mine_active.png',
  },
};

// Prominent, non-overlapping clearings for resource islands (upper half of tile)
const SINGLE_RESOURCE_SLOT = { top: '20%', left: '50%', transform: 'translateX(-50%)', size: 46 };

const DUAL_RESOURCE_SLOTS = [
  { top: '20%', left: '14%', size: 38 },
  { top: '20%', right: '14%', size: 38 },
];

const TRIPLE_RESOURCE_SLOTS = [
  { top: '10%', left: '12%', size: 32 },
  { top: '10%', right: '12%', size: 32 },
  { top: '38%', left: '50%', transform: 'translateX(-50%)', size: 32 },
];

// Base tile non-overlapping peripheral clearings (around the center castle)
const BASE_RESOURCE_SLOTS = [
  { top: '6px', left: '6px', size: 28 },   // Food (Top-Left corner)
  { top: '6px', right: '6px', size: 28 },  // Wood (Top-Right corner)
  { top: '38%', right: '6px', size: 28 },  // Gold (Mid-Right edge)
];

export const TileResources = React.memo(function TileResources({ island, isBase = false }: TileResourcesProps) {
  const { gameState } = useGameBoard();
  const { players } = gameState;
  const { resources, positionedBy = [], type: islandType, monsters } = island;

  // Monsters on tile suppress resources until defeated
  if (islandType === IslandType.Monster && monsters && monsters.length > 0) {
    return null;
  }

  if (!resources || resources.length === 0) {
    return null;
  }

  // Expand resource amounts into individual distinct nodes (no x2 badges; 2 sheep/trees/mines rendered side-by-side)
  type ExpandedResourceNode = {
    type: ResourceType;
    nodeIndex: number;
    totalForType: number;
  };

  const expandedNodes: ExpandedResourceNode[] = [];
  resources.forEach(r => {
    const count = isBase ? 1 : Math.max(1, r.amount || 1);
    for (let i = 0; i < count; i++) {
      expandedNodes.push({
        type: r.type,
        nodeIndex: i,
        totalForType: count,
      });
    }
  });

  const getSlot = (idx: number, total: number) => {
    if (isBase) {
      return BASE_RESOURCE_SLOTS[idx % BASE_RESOURCE_SLOTS.length];
    }
    if (total === 1) {
      return SINGLE_RESOURCE_SLOT;
    }
    if (total === 2) {
      return DUAL_RESOURCE_SLOTS[idx % DUAL_RESOURCE_SLOTS.length];
    }
    return TRIPLE_RESOURCE_SLOTS[idx % TRIPLE_RESOURCE_SLOTS.length];
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-28 select-none"
      data-testid="tile-resources"
    >
      {expandedNodes.map((node, idx) => {
        const slot = getSlot(idx, expandedNodes.length);
        const positionInfo = positionedBy.find(p => p.resource === node.type);
        const positionedPlayer = positionInfo ? players.find(p => p.id === positionInfo.playerId) : null;
        
        // Show active collector farming and active sprite on ALL nodes of the garrisoned resource type
        const isFarmedNode = !!positionedPlayer;
        const spriteConfig = RESOURCE_SPRITES[node.type];
        const spriteSrc = isFarmedNode ? spriteConfig.activeSprite : spriteConfig.sprite;

        // Food sprite (sheep.gif) has large transparent canvas padding, so scale its bounding box by 1.45x
        const nodeSize = node.type === ResourceTypeEnum.Food
          ? Math.round(slot.size * 1.45)
          : slot.size;

        return (
          <div
            key={`resource-node-${node.type}-${idx}`}
            data-testid={`resource-node-${node.type}`}
            className="absolute flex flex-col items-center justify-center"
            style={{
              top: slot.top,
              bottom: (slot as { bottom?: string }).bottom,
              left: (slot as { left?: string }).left,
              right: (slot as { right?: string }).right,
              transform: (slot as { transform?: string }).transform,
              width: `${nodeSize}px`,
              height: `${nodeSize}px`,
            }}
          >
            {/* Animated Natural Resource Sprite (Sheep, Tree, Mine) */}
            <div
              data-testid={`resource-sprite-${node.type}`}
              className="relative w-full h-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)] transition-transform hover:scale-110"
            >
              <Image
                src={spriteSrc}
                alt={`${node.type} resource`}
                width={nodeSize}
                height={nodeSize}
                className="h-full w-full object-contain"
                unoptimized
              />
            </div>

            {/* Active Farming Collector positioned directly on each harvested resource node */}
            {isFarmedNode && FARM_SPRITES[positionedPlayer.color] && (
              <div
                data-testid={`collector-farm-${positionedPlayer.color}`}
                className="absolute -top-3.5 -right-2 z-35 w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
              >
                <Image
                  src={FARM_SPRITES[positionedPlayer.color]}
                  alt={`${positionedPlayer.color} collector farming`}
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
