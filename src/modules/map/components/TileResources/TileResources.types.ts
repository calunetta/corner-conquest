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
  /** CSS percent of the node's own rendered box; the badge is square. '65%' for Wood/Gold,
   *  '44.8%' for Food (65% divided by the Food sprite scale, rounded to one decimal).
   *  The badge always sits on the node's left edge, so there is no side field. */
  size: string;
}
