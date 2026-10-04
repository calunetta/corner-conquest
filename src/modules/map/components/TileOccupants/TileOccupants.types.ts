import type { Island, PlayerColor } from '@/lib/types';

export interface TileOccupantsProps {
  island: Island;
}

export interface OccupantSpriteViewModel {
  key: string;
  color: PlayerColor;
  sprite: string;
  positionClasses: string;
  isFaded: boolean;
}
