import { ResourceType } from '@/lib/types';
import { toWealthyDialogViewModel } from './WealthyDialog.map';

describe('toWealthyDialogViewModel', () => {
  it('always returns Food, Wood, Gold in that fixed order, regardless of arguments', () => {
    const viewModel = toWealthyDialogViewModel();

    expect(viewModel.options.map((option) => option.resource)).toEqual([
      ResourceType.Food,
      ResourceType.Wood,
      ResourceType.Gold,
    ]);
  });

  it('attaches the correct sprite and display name per resource', () => {
    const viewModel = toWealthyDialogViewModel();

    expect(viewModel).toEqual({
      options: [
        { resource: ResourceType.Food, sprite: '/sprites/sheep.gif', displayName: 'Food' },
        { resource: ResourceType.Wood, sprite: '/sprites/tree.gif', displayName: 'Wood' },
        { resource: ResourceType.Gold, sprite: '/sprites/gold.gif', displayName: 'Gold' },
      ],
    });
  });

  it('is deterministic: calling it twice returns equal view models', () => {
    expect(toWealthyDialogViewModel()).toEqual(toWealthyDialogViewModel());
  });
});
