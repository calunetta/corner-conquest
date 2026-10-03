import type { CardName, Player } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { SPECIAL_CARD_DESCRIPTIONS, USABLE_CARDS } from '@/modules/game-rules';
import type { CardsDialogViewModel, SpecialCardViewModel } from './CardsDialog.types';

const NO_DESCRIPTION = 'No description available.';

/** Pure. Mirrors legacy CardsDialog.tsx's derived data exactly. */
export function toCardsDialogViewModel(player: Player, canUseCards: boolean): CardsDialogViewModel {
  const cardCounts = player.specialCards.reduce((counts, card) => {
    counts[card] = (counts[card] ?? 0) + 1;
    return counts;
  }, {} as Record<CardName, number>);

  const cards: SpecialCardViewModel[] = (Object.keys(cardCounts) as CardName[]).map((name) => ({
    name,
    count: cardCounts[name],
    description: SPECIAL_CARD_DESCRIPTIONS[name] || NO_DESCRIPTION,
    isUsable: USABLE_CARDS.includes(name),
  }));

  return {
    playerName: player.name,
    cards,
    canUseCardAbility: canUseCards && !player.actionsThisTurn.includes(GameAction.UseCard),
  };
}
