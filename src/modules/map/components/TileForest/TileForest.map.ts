import type { Island } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { TREE_SPRITES } from './TileForest.types';
import type { ForestLayout, TreeSlot } from './TileForest.types';

export function toForestLayout(island: Island, isBase: boolean): ForestLayout | null {
  // Suppress decorative forests on Resource islands and on living Monster islands
  if (
    island.type === IslandType.Resource ||
    (island.type === IslandType.Monster && island.monsters && island.monsters.length > 0)
  ) {
    return null;
  }

  // Deterministically select tree sprites and natural placements
  const seed = Math.abs(island.x * 7 + island.y * 13 + (isBase ? 3 : 0));
  const treeSprite = TREE_SPRITES[seed % TREE_SPRITES.length];

  if (isBase) {
    const layout: TreeSlot[] = [
      { top: '4px', left: '32%', size: '16%', z: 12 },
      { top: '10%', left: '38%', size: '16%', z: 14 },
    ];
    return { treeSprite, layout };
  }

  if (island.type === IslandType.Special) {
    const layout: TreeSlot[] = [{ top: '4px', left: '4px', size: '16%', z: 12 }];
    return { treeSprite, layout };
  }

  // Empty or Cleared Island: Natural lush tree grove
  const treeCount = seed % 2 === 0 ? 2 : 3;
  const emptyGrovePositions: TreeSlot[] = [
    { top: '18%', left: '22%', size: '28%', z: 12 },
    { top: '24%', right: '22%', size: '28%', z: 14 },
    { bottom: '26%', left: '44%', size: '28%', z: 13 },
  ];

  return {
    treeSprite,
    layout: emptyGrovePositions.slice(0, treeCount),
  };
}
