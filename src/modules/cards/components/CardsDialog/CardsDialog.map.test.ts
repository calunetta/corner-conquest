import { toCardsDialogViewModel } from './CardsDialog.map';
import { CardName, type Player } from '@/lib/types';
import {
  playerWithNoCards,
  playerWithSeveralCards,
  playerWhoUsedACardThisTurn,
} from './CardsDialog.fixtures';

describe('CardsDialog.map', () => {
  describe('toCardsDialogViewModel', () => {
    it('returns an empty cards array for a player with no special cards', () => {
      const viewModel = toCardsDialogViewModel(playerWithNoCards, true);

      expect(viewModel.cards).toEqual([]);
      expect(viewModel.playerName).toBe('Ada');
    });

    it('tallies duplicate card names into one entry, preserving first-seen order', () => {
      const viewModel = toCardsDialogViewModel(playerWithSeveralCards, true);

      expect(viewModel.cards.map((c) => c.name)).toEqual([
        CardName.StealResource,
        CardName.Sabotage,
        CardName.Overcome,
      ]);
      expect(viewModel.cards[0].count).toBe(2);
      expect(viewModel.cards[1].count).toBe(1);
      expect(viewModel.cards[2].count).toBe(1);
    });

    it('marks a usable card as isUsable true', () => {
      const viewModel = toCardsDialogViewModel(playerWithSeveralCards, true);
      const stealResource = viewModel.cards.find((c) => c.name === CardName.StealResource);

      expect(stealResource?.isUsable).toBe(true);
    });

    it('marks a non-usable card as isUsable false', () => {
      const viewModel = toCardsDialogViewModel(playerWithSeveralCards, true);
      const overcome = viewModel.cards.find((c) => c.name === CardName.Overcome);

      expect(overcome?.isUsable).toBe(false);
    });

    it('fills in a fallback description when none is defined for the card', () => {
      const playerWithUnknownCard = {
        ...playerWithNoCards,
        specialCards: ['Not A Real Card' as CardName],
      } as Player;

      const viewModel = toCardsDialogViewModel(playerWithUnknownCard, true);

      expect(viewModel.cards[0].description).toBe('No description available.');
    });

    it('canUseCardAbility is true when canUseCards is true and no card was used this turn', () => {
      const viewModel = toCardsDialogViewModel(playerWithSeveralCards, true);
      expect(viewModel.canUseCardAbility).toBe(true);
    });

    it('canUseCardAbility is false when canUseCards is false', () => {
      const viewModel = toCardsDialogViewModel(playerWithSeveralCards, false);
      expect(viewModel.canUseCardAbility).toBe(false);
    });

    it('canUseCardAbility is false when the player already used a card this turn, even if canUseCards is true', () => {
      const viewModel = toCardsDialogViewModel(playerWhoUsedACardThisTurn, true);
      expect(viewModel.canUseCardAbility).toBe(false);
    });

    it('does not mutate the player argument', () => {
      const before = JSON.parse(JSON.stringify(playerWithSeveralCards));
      toCardsDialogViewModel(playerWithSeveralCards, true);
      expect(playerWithSeveralCards).toEqual(before);
    });
  });
});
