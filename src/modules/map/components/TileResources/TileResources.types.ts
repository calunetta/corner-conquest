import type { Island, PlayerColor, ResourceType } from '@/lib/types';

export interface TileResourcesProps {
  island: Island;
  isBase?: boolean;
}

export interface ResourceNodeViewModel {
  type: ResourceType;
  key: string;
  spriteSrc: string;
  nodeSize: number;
  slotStyle: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform?: string;
    width?: string; // percent, Base slots only
    height?: string; // percent, Base slots only
  };
  farmingCollector: FarmingCollectorViewModel | null;
}

export interface FarmingCollectorViewModel {
  color: PlayerColor;
  sprite: string;
  /** px; badge is square. ~55% of the node's pre-Food-scale slot size, floored at 22px. */
  size: number;
  /** Which side of the resource sprite the badge sits on: 'left' when the node's own slot
   *  is right-anchored (avoids pushing the badge off-tile), 'right' otherwise. */
  side: 'left' | 'right';
  /** px offset from the node box's `side` edge to the badge's center. Negative = the badge
   *  overhangs past the node box (same half-overhang convention as TileBoats/TileOccupants'
   *  corner anchors). Applied as the CSS property named by `side`. */
  offset: number;
}
