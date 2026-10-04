import type { IslandResource } from '@/lib/types';
import { ResourceType } from '@/lib/types';
import { toPositionDialogViewModel } from './PositionDialog.map';

describe('toPositionDialogViewModel', () => {
  it('returns an empty options array for empty input', () => {
    expect(toPositionDialogViewModel([])).toEqual({ options: [] });
  });

  it('maps a single resource to its view model', () => {
    const resources: IslandResource[] = [{ type: ResourceType.Gold, amount: 2 }];

    expect(toPositionDialogViewModel(resources)).toEqual({
      options: [
        {
          type: ResourceType.Gold,
          amount: 2,
          sprite: '/sprites/gold.gif',
          displayName: 'Gold',
        },
      ],
    });
  });

  it('maps multiple resources, preserving order', () => {
    const resources: IslandResource[] = [
      { type: ResourceType.Food, amount: 3 },
      { type: ResourceType.Wood, amount: 1 },
      { type: ResourceType.Gold, amount: 2 },
    ];

    const result = toPositionDialogViewModel(resources);

    expect(result.options.map((option) => option.type)).toEqual([
      ResourceType.Food,
      ResourceType.Wood,
      ResourceType.Gold,
    ]);
    expect(result.options[0]).toEqual({
      type: ResourceType.Food,
      amount: 3,
      sprite: '/sprites/sheep.gif',
      displayName: 'Food',
    });
  });

  it('falls back to the default sprite when a resource type has no entry in RESOURCE_SPRITES', () => {
    // RESOURCE_SPRITES is a complete Record<ResourceType, string> today (all 3 keys present),
    // so this fallback never actually triggers with real data. Exercise it with a value
    // outside the known ResourceType union, via a typed cast at the test boundary (not `any`).
    const unknownType = 'unknown' as ResourceType;
    const resources: IslandResource[] = [{ type: unknownType, amount: 5 }];

    const result = toPositionDialogViewModel(resources);

    expect(result.options[0].sprite).toBe('/sprites/mine.png');
  });

  it('does not mutate the input array', () => {
    const resources: IslandResource[] = [{ type: ResourceType.Gold, amount: 2 }];
    const inputCopy = [...resources];

    toPositionDialogViewModel(resources);

    expect(resources).toEqual(inputCopy);
  });
});
