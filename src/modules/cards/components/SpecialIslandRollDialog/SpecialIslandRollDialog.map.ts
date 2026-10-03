import type { SpecialIslandRollDialogState } from '@/lib/types';
import { SPECIAL_CARD_DESCRIPTIONS } from '@/modules/game-rules';
import type { SpecialIslandRollViewModel } from './SpecialIslandRollDialog.types';

/** Pure. `state` is the dialog's own non-null shape; callers check for null first. */
export function toSpecialIslandRollViewModel(
  state: NonNullable<SpecialIslandRollDialogState>,
): SpecialIslandRollViewModel {
  const { roll, cardDrawn } = state;

  return {
    isRolled: roll !== null,
    roll,
    cardDrawn,
    cardDescription: cardDrawn ? SPECIAL_CARD_DESCRIPTIONS[cardDrawn] : null,
  };
}
