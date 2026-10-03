import { toAbilitiesDialogViewModel } from './AbilitiesDialog.map';
import { AbilityName } from '@/lib/types';
import {
  gameStateWithAffordableAbilities,
  playerWhoCanAffordAbilities,
  playerWithExplorerAndNoGold,
} from './AbilitiesDialog.fixtures';

describe('AbilitiesDialog.map', () => {
  describe('toAbilitiesDialogViewModel', () => {
    it('includes the cost from gameState.settings.abilityCost', () => {
      const viewModel = toAbilitiesDialogViewModel(
        gameStateWithAffordableAbilities,
        playerWhoCanAffordAbilities,
        true,
      );
      expect(viewModel.cost).toBe(10);
    });

    it('filters abilities down to gameState.settings.availableAbilities', () => {
      const restricted = {
        ...gameStateWithAffordableAbilities,
        settings: {
          ...gameStateWithAffordableAbilities.settings,
          availableAbilities: [AbilityName.Explorer],
        },
      };

      const viewModel = toAbilitiesDialogViewModel(restricted, playerWhoCanAffordAbilities, true);

      expect(viewModel.abilities.map((a) => a.name)).toEqual([AbilityName.Explorer]);
    });

    it('hasAbility is true for an ability the player already owns', () => {
      const viewModel = toAbilitiesDialogViewModel(
        gameStateWithAffordableAbilities,
        playerWithExplorerAndNoGold,
        true,
      );
      const explorer = viewModel.abilities.find((a) => a.name === AbilityName.Explorer);
      expect(explorer?.hasAbility).toBe(true);
    });

    it('showBuyButton is false for an owned ability even when it is the player\'s turn', () => {
      const viewModel = toAbilitiesDialogViewModel(
        gameStateWithAffordableAbilities,
        playerWithExplorerAndNoGold,
        true,
      );
      const explorer = viewModel.abilities.find((a) => a.name === AbilityName.Explorer);
      expect(explorer?.showBuyButton).toBe(false);
    });

    it('showBuyButton is false when it is not the player\'s turn, even for an unowned ability', () => {
      const viewModel = toAbilitiesDialogViewModel(
        gameStateWithAffordableAbilities,
        playerWhoCanAffordAbilities,
        false,
      );
      expect(viewModel.abilities.every((a) => !a.showBuyButton)).toBe(true);
    });

    it('showBuyButton is true for an unowned ability on the player\'s turn', () => {
      const viewModel = toAbilitiesDialogViewModel(
        gameStateWithAffordableAbilities,
        playerWhoCanAffordAbilities,
        true,
      );
      expect(viewModel.abilities.every((a) => a.showBuyButton)).toBe(true);
    });

    it('canAfford is true when the player\'s gold is at least the cost', () => {
      const viewModel = toAbilitiesDialogViewModel(
        gameStateWithAffordableAbilities,
        playerWhoCanAffordAbilities,
        true,
      );
      expect(viewModel.abilities.every((a) => a.canAfford)).toBe(true);
    });

    it('canAfford is false when the player cannot afford the cost', () => {
      const viewModel = toAbilitiesDialogViewModel(
        gameStateWithAffordableAbilities,
        playerWithExplorerAndNoGold,
        true,
      );
      const collector = viewModel.abilities.find((a) => a.name === AbilityName.Collector);
      expect(collector?.canAfford).toBe(false);
    });

    it('canAfford is true when the player\'s gold exactly equals the cost (boundary)', () => {
      const playerWithExactGold = { ...playerWhoCanAffordAbilities, resources: { food: 0, wood: 0, gold: 10 } };

      const viewModel = toAbilitiesDialogViewModel(gameStateWithAffordableAbilities, playerWithExactGold, true);

      expect(viewModel.abilities.every((a) => a.canAfford)).toBe(true);
    });

    it('returns no abilities when none are available in settings', () => {
      const noneAvailable = {
        ...gameStateWithAffordableAbilities,
        settings: { ...gameStateWithAffordableAbilities.settings, availableAbilities: [] },
      };

      const viewModel = toAbilitiesDialogViewModel(noneAvailable, playerWhoCanAffordAbilities, true);
      expect(viewModel.abilities).toEqual([]);
    });

    it('does not mutate the player argument', () => {
      const before = JSON.parse(JSON.stringify(playerWhoCanAffordAbilities));
      toAbilitiesDialogViewModel(gameStateWithAffordableAbilities, playerWhoCanAffordAbilities, true);
      expect(playerWhoCanAffordAbilities).toEqual(before);
    });
  });
});
