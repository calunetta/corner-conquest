import type { Island } from '@/lib/types';
import type { TreeSlot } from '../../island-tile-slots.types';

export type { TreeSlot } from '../../island-tile-slots.types';

export const TREE_SPRITES = [
  '/sprites/pine_tree.gif',
  '/sprites/spring_tree.gif',
  '/sprites/autmn_tree.gif',
  '/sprites/tree.gif',
] as const;

export interface TileForestProps {
  island: Island;
  isBase?: boolean;
}

export interface ForestLayout {
  treeSprite: (typeof TREE_SPRITES)[number];
  layout: TreeSlot[];
}
