import { ResourceType } from '@/lib/types';
import { toResourceGainEntries } from './resource-gain-log';

describe('toResourceGainEntries', () => {
  it('returns an empty array for empty amounts (empty input)', () => {
    expect(toResourceGainEntries({})).toEqual([]);
  });

  it.each([0, -1])('drops a type whose amount is %p (boundary: non-positive)', (amount) => {
    expect(toResourceGainEntries({ [ResourceType.Gold]: amount })).toEqual([]);
  });

  it('drops a type whose amount is explicitly undefined (invalid input)', () => {
    expect(toResourceGainEntries({ [ResourceType.Gold]: undefined })).toEqual([]);
  });

  it('keeps a type whose amount is exactly 1 (boundary: smallest positive)', () => {
    expect(toResourceGainEntries({ [ResourceType.Wood]: 1 })).toEqual([{ type: ResourceType.Wood, amount: 1 }]);
  });

  it('creates one entry per resource type, each with its own amount', () => {
    const result = toResourceGainEntries({ [ResourceType.Food]: 2, [ResourceType.Gold]: 3 });

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { type: ResourceType.Food, amount: 2 },
        { type: ResourceType.Gold, amount: 3 },
      ]),
    );
  });

  it('omits the tileIds field for a type absent from tileIdsByType', () => {
    const result = toResourceGainEntries({ [ResourceType.Wood]: 1 }, { [ResourceType.Gold]: ['1-1'] });

    expect(result).toEqual([{ type: ResourceType.Wood, amount: 1 }]);
    expect(result[0]).not.toHaveProperty('tileIds');
  });

  it('omits the tileIds field when the type maps to an empty array (boundary: empty tile list)', () => {
    const result = toResourceGainEntries({ [ResourceType.Wood]: 1 }, { [ResourceType.Wood]: [] });

    expect(result).toEqual([{ type: ResourceType.Wood, amount: 1 }]);
    expect(result[0]).not.toHaveProperty('tileIds');
  });

  it('attaches tileIds to a type present in tileIdsByType', () => {
    const result = toResourceGainEntries({ [ResourceType.Gold]: 2 }, { [ResourceType.Gold]: ['0-0', '1-0'] });

    expect(result).toEqual([{ type: ResourceType.Gold, amount: 2, tileIds: ['0-0', '1-0'] }]);
  });

  it('keeps duplicate tile ids as given (same tile twice for one type)', () => {
    const result = toResourceGainEntries({ [ResourceType.Gold]: 2 }, { [ResourceType.Gold]: ['0-0', '0-0'] });

    expect(result[0].tileIds).toEqual(['0-0', '0-0']);
  });

  it('does not mutate the input amounts or tile-id maps (pure)', () => {
    const amounts = { [ResourceType.Gold]: 2 };
    const tileIdsByType = { [ResourceType.Gold]: ['0-0'] };
    const amountsBefore = { ...amounts };
    const tileIdsBefore = { [ResourceType.Gold]: [...tileIdsByType[ResourceType.Gold]] };

    toResourceGainEntries(amounts, tileIdsByType);

    expect(amounts).toEqual(amountsBefore);
    expect(tileIdsByType).toEqual(tileIdsBefore);
  });

  it('copies tileIds so a later change to the input array does not leak into the result', () => {
    const tileIdsByType: Partial<Record<ResourceType, string[]>> = { [ResourceType.Gold]: ['0-0'] };
    const result = toResourceGainEntries({ [ResourceType.Gold]: 1 }, tileIdsByType);

    tileIdsByType[ResourceType.Gold]!.push('9-9');

    expect(result[0].tileIds).toEqual(['0-0']);
  });
});
