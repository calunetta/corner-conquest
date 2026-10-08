import type { Island, PlayerColor } from '@/lib/types';

export interface TileOccupantsProps {
  island: Island;
}

export interface OccupantSpriteViewModel {
  key: string;
  color: PlayerColor;
  sprite: string;
  /** Same corner (top/bottom/left/right: '0') and transform as the matching-index
   *  BoatEntryViewModel.cornerStyle — both built from the same BOAT_CORNER_POSITIONS entry. */
  slotStyle: Record<string, string>;
  isFaded: boolean;
  /** True for the 5th+ occupant on one tile: corner wraps (mod 4), shrinks and fades
   *  (unchanged pre-existing behavior, just renamed from an inline ternary). */
  isOverflow: boolean;
}
