import { toSpecialIslandRollViewModel } from './SpecialIslandRollDialog.map';
import { CardName } from '@/lib/types';
import { notRolledState, rolledWithCardState, rolledWithoutCardState } from './SpecialIslandRollDialog.fixtures';

describe('SpecialIslandRollDialog.map', () => {
  describe('toSpecialIslandRollViewModel', () => {
    it('isRolled is false and roll/cardDrawn/cardDescription are all null before rolling', () => {
      const viewModel = toSpecialIslandRollViewModel(notRolledState);

      expect(viewModel.isRolled).toBe(false);
      expect(viewModel.roll).toBeNull();
      expect(viewModel.cardDrawn).toBeNull();
      expect(viewModel.cardDescription).toBeNull();
    });

    it('isRolled is true with a roll value and no description when no card was drawn', () => {
      const viewModel = toSpecialIslandRollViewModel(rolledWithoutCardState);

      expect(viewModel.isRolled).toBe(true);
      expect(viewModel.roll).toBe(2);
      expect(viewModel.cardDrawn).toBeNull();
      expect(viewModel.cardDescription).toBeNull();
    });

    it('resolves the card description when a card was drawn', () => {
      const viewModel = toSpecialIslandRollViewModel(rolledWithCardState);

      expect(viewModel.isRolled).toBe(true);
      expect(viewModel.roll).toBe(3);
      expect(viewModel.cardDrawn).toBe(CardName.Wealthy);
      expect(viewModel.cardDescription).toBe('Gain 5 resources of your choice.');
    });

    it('does not mutate the state argument', () => {
      const before = JSON.parse(JSON.stringify(rolledWithCardState));
      toSpecialIslandRollViewModel(rolledWithCardState);
      expect(rolledWithCardState).toEqual(before);
    });
  });
});
