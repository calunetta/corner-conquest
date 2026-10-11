import type { Island } from '@/lib/types';
import { IslandType } from '@/lib/types';
import { TREE_SPRITES } from './TileForest.types';
import type { ForestLayout } from './TileForest.types';
import {
  BASE_FOREST_SLOTS,
  SPECIAL_FOREST_SLOT,
  EMPTY_GROVE_SLOTS,
} from '../../island-tile-slots.types';

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
    return { treeSprite, layout: BASE_FOREST_SLOTS };
  }

  if (island.type === IslandType.Special) {
    return { treeSprite, layout: SPECIAL_FOREST_SLOT };
  }

  // Empty or Cleared Island: Natural lush tree grove
  const treeCount = seed % 2 === 0 ? 2 : 3;

  return {
    treeSprite,
    layout: EMPTY_GROVE_SLOTS.slice(0, treeCount),
  };
}
