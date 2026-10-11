import type { Island, PlayerColor } from '@/lib/types';

export type { CornerId, CornerPosition } from '../../island-tile-slots.types';
export { BOAT_CORNER_POSITIONS, CORNER_TRANSFORMS } from '../../island-tile-slots.types';

export interface TileBoatsProps {
  island: Island;
}

export interface BoatEntryViewModel {
  key: string;
  color: PlayerColor;
  /** top/bottom/left/right: '0' (one CornerPosition's style) plus `transform`; applied via
   *  `style=` on `.boatEntry`. */
  cornerStyle: Record<string, string>;
  showIdleCollector: boolean;
  idleCollectorSprite?: string;
}
