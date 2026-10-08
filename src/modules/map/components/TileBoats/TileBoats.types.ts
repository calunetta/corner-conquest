import type { Island, PlayerColor } from '@/lib/types';

export type CornerId = 'br' | 'tr' | 'tl' | 'bl';

export interface CornerPosition {
  id: CornerId;
  /** Always exactly two of these four keys, each '0'. */
  style: Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;
}

/** Order is load-bearing: TileOccupants.hook.ts imports this directly so occupant index N
 *  always lands on the same corner as boat entry index N. Do not reorder without updating
 *  both consumers. */
export const BOAT_CORNER_POSITIONS: CornerPosition[] = [
  { id: 'br', style: { bottom: '0', right: '0' } },
  { id: 'tr', style: { top: '0', right: '0' } },
  { id: 'tl', style: { top: '0', left: '0' } },
  { id: 'bl', style: { bottom: '0', left: '0' } },
];

/** Centers an element on its tile corner point: half of its own box overhangs past the tile
 *  edge regardless of the element's size. This is what lets the boat (42% of T, see
 *  TileBoats.styles.ts) and the rider (29% of T, see TileOccupants.styles.ts) share one
 *  corner with the rider's box always fully inside the boat's box. */
export const CORNER_TRANSFORMS: Record<CornerId, string> = {
  br: 'translate(50%, 50%)',
  tr: 'translate(50%, -50%)',
  tl: 'translate(-50%, -50%)',
  bl: 'translate(-50%, 50%)',
};

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
