import type { Island, PlayerColor, ResourceType } from '@/lib/types';

export interface TileResourcesProps {
  island: Island;
  isBase?: boolean;
}

export interface ResourceNodeViewModel {
  type: ResourceType;
  key: string;
  spriteSrc: string;
  /** CSS percent length of the node's own box, e.g. '39%' or '56.6%'. */
  nodeSize: string;
  slotStyle: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform?: string;
  };
  farmingCollector: FarmingCollectorViewModel | null;
}

export interface FarmingCollectorViewModel {
  color: PlayerColor;
  sprite: string;
  /** CSS percent of the node's own rendered box; the badge is square. '55%' for Wood/Gold,
   *  '37.9%' for Food (55% divided by the Food sprite scale, rounded to one decimal). */
  size: string;
  /** Which side of the resource sprite the badge sits on: 'left' when the node's own slot
   *  is right-anchored (avoids pushing the badge off-tile), 'right' otherwise. */
  side: 'left' | 'right';
}
