'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { Island } from '@/lib/types';
import { IslandType } from '@/lib/types';

interface TileForestProps {
  island: Island;
  isBase?: boolean;
}

export const TREE_SPRITES = [
  '/sprites/pine_tree.gif',
  '/sprites/spring_tree.gif',
  '/sprites/autmn_tree.gif',
  '/sprites/tree.gif',
] as const;

export const TileForest = React.memo(function TileForest({ island, isBase = false }: TileForestProps) {
  // Suppress decorative forests on Resource islands (so players only see true harvestable resource nodes)
  // and on living Monster islands
  if (
    island.type === IslandType.Resource ||
    (island.type === IslandType.Monster && island.monsters && island.monsters.length > 0)
  ) {
    return null;
  }

  // Deterministically select tree sprites and natural placements
  const { treeSprite, layout } = useMemo(() => {
    const seed = Math.abs(island.x * 7 + island.y * 13 + (isBase ? 3 : 0));
    const sprite = TREE_SPRITES[seed % TREE_SPRITES.length];

    if (isBase) {
      return {
        treeSprite: sprite,
        layout: [
          { top: '4px', left: '32%', size: 18, z: 12 },
          { top: '10%', left: '38%', size: 16, z: 14 },
        ],
      };
    }

    if (island.type === IslandType.Special) {
      return {
        treeSprite: sprite,
        layout: [
          { top: '4px', left: '4px', size: 16, z: 12 },
        ],
      };
    }

    // Empty or Cleared Island: Natural lush tree grove
    const treeCount = (seed % 2 === 0) ? 2 : 3;
    const emptyGrovePositions = [
      { top: '18%', left: '22%', size: 28, z: 12 },
      { top: '24%', right: '22%', size: 30, z: 14 },
      { bottom: '26%', left: '44%', size: 26, z: 13 },
    ];

    return {
      treeSprite: sprite,
      layout: emptyGrovePositions.slice(0, treeCount),
    };
  }, [island.x, island.y, island.type, isBase]);

  return (
    <div className="pointer-events-none absolute inset-0 z-12 overflow-hidden select-none" data-testid="tile-forest">
      {layout.map((pos, idx) => (
        <div
          key={`forest-tree-${idx}`}
          data-testid="tile-forest-tree"
          className="absolute drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-transform duration-300"
          style={{
            top: pos.top,
            bottom: (pos as { bottom?: string }).bottom,
            left: (pos as { left?: string }).left,
            right: (pos as { right?: string }).right,
            width: `${pos.size}px`,
            height: `${pos.size}px`,
            zIndex: pos.z,
          }}
        >
          <Image
            src={treeSprite}
            alt="Island Tree"
            width={pos.size}
            height={pos.size}
            className="h-full w-full object-contain"
            unoptimized
          />
        </div>
      ))}
    </div>
  );
});
