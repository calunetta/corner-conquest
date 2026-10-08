import type { Island } from '@/lib/types';

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

export interface TreeSlot {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  /** Percent of the tile's own side length T, e.g. '28%'. Was a px number. */
  size: string;
  z: number;
}

export interface ForestLayout {
  treeSprite: (typeof TREE_SPRITES)[number];
  layout: TreeSlot[];
}
