import type { Island, PlayerColor } from '@/lib/types';

export interface TileOccupantsProps {
  island: Island;
}

export interface OccupantSpriteViewModel {
  key: string;
  color: PlayerColor;
  sprite: string;
  /** Offset slot (top/bottom/left/right: '24%') from OCCUPANT_CORNER_SLOTS. Same corner id as the
   *  matching-index boat, but not its anchor: the knight sits beside the boat, not on its point. */
  slotStyle: Record<string, string>;
  isFaded: boolean;
  /** True for the 5th+ occupant on one tile: corner wraps (mod 4), shrinks and fades
   *  (unchanged pre-existing behavior, just renamed from an inline ternary). */
  isOverflow: boolean;
}
