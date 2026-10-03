import type { SpecialIslandRollDialogState } from '@/lib/types';
import { CardName } from '@/lib/types';

/** Not yet rolled: shows the dice animation and the roll button. */
export const notRolledState: NonNullable<SpecialIslandRollDialogState> = {
  isOpen: true,
  roll: null,
  cardDrawn: null,
};

/** Rolled a winning number: a special card was drawn. */
export const rolledWithCardState: NonNullable<SpecialIslandRollDialogState> = {
  isOpen: true,
  roll: 3,
  cardDrawn: CardName.Wealthy,
};

/** Rolled a losing number: no card drawn. */
export const rolledWithoutCardState: NonNullable<SpecialIslandRollDialogState> = {
  isOpen: true,
  roll: 2,
  cardDrawn: null,
};
