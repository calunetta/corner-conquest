import { toProductiveCardDialogViewModel } from './ProductiveCardDialog.map';
import { ResourceType } from '@/lib/types';
import { productiveDialogState } from './ProductiveCardDialog.fixtures';

describe('ProductiveCardDialog.map', () => {
  describe('toProductiveCardDialogViewModel', () => {
    it('marks no option as selected when selectedResource is null', () => {
      const viewModel = toProductiveCardDialogViewModel(productiveDialogState, null);
      expect(viewModel.options.every((o) => !o.isSelected)).toBe(true);
    });

    it('marks exactly the matching option as selected', () => {
      const viewModel = toProductiveCardDialogViewModel(productiveDialogState, ResourceType.Wood);
      const wood = viewModel.options.find((o) => o.resource === ResourceType.Wood);
      const food = viewModel.options.find((o) => o.resource === ResourceType.Food);

      expect(wood?.isSelected).toBe(true);
      expect(food?.isSelected).toBe(false);
    });

    it('resolves each option\'s sprite and display name', () => {
      const viewModel = toProductiveCardDialogViewModel(productiveDialogState, null);
      const food = viewModel.options.find((o) => o.resource === ResourceType.Food);

      expect(food?.sprite).toBe('/sprites/sheep.gif');
      expect(food?.displayName).toBe('Food');
    });

    it('confirmLabel is the default "Harvest Normally" copy when nothing is selected', () => {
      const viewModel = toProductiveCardDialogViewModel(productiveDialogState, null);
      expect(viewModel.confirmLabel).toBe('Harvest Normally (Skip 2x)');
    });

    it('confirmLabel names the selected resource\'s double-harvest copy', () => {
      const viewModel = toProductiveCardDialogViewModel(productiveDialogState, ResourceType.Gold);
      expect(viewModel.confirmLabel).toBe('Double Gold Harvest');
    });

    it('returns an empty options array for an empty options list', () => {
      const viewModel = toProductiveCardDialogViewModel({ isOpen: true, options: [] }, null);
      expect(viewModel.options).toEqual([]);
    });

    it('does not mutate the state argument', () => {
      const before = JSON.parse(JSON.stringify(productiveDialogState));
      toProductiveCardDialogViewModel(productiveDialogState, ResourceType.Food);
      expect(productiveDialogState).toEqual(before);
    });
  });
});
